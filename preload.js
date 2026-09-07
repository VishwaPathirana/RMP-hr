const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getKV: (key) => ipcRenderer.invoke('kv-get', key),
  setKV: (key, value) => ipcRenderer.invoke('kv-set', key, value)
});
