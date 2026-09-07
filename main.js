const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Data file lives in the app's user data folder on this laptop, e.g.
// C:\Users\<you>\AppData\Roaming\RMP HR System\hr-data.json
const DATA_FILE = path.join(app.getPath('userData'), 'hr-data.json');

function readAllData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read data file, starting fresh backup', e);
    // Preserve the corrupted file instead of silently discarding it
    try {
      fs.copyFileSync(DATA_FILE, DATA_FILE + '.corrupted-' + Date.now());
    } catch (_) {}
  }
  return {};
}

function writeAllData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

ipcMain.handle('kv-get', (event, key) => {
  const all = readAllData();
  return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : null;
});

ipcMain.handle('kv-set', (event, key, value) => {
  const all = readAllData();
  all[key] = value;
  writeAllData(all);
  return true;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'rmp-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
