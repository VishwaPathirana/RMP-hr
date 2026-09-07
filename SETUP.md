# RMP HR System — Windows Desktop App (fully offline)

This turns your app into real installed Windows software. Data is saved
to a local JSON file in this laptop's user folder — nothing goes over the
internet, no server, no Vercel, no tunnel.

Data file location once installed:
`C:\Users\<your-username>\AppData\Roaming\RMP HR System\hr-data.json`

## One-time build (do this once, on any Windows PC with Node.js)

1. Install Node.js (LTS) from https://nodejs.org — plain installer, click
   through it like any other program.
2. Copy this whole `electron-app` folder onto that PC.
3. Open a terminal (Command Prompt or PowerShell) inside the folder and run:
   ```
   npm install
   ```
4. Build the installer:
   ```
   npm run dist
   ```
5. When it finishes, look in the new `dist` folder for something like:
   `RMP HR System Setup 1.0.0.exe`
   That single .exe is your installer.

## Installing on the client laptop

1. Copy `RMP HR System Setup 1.0.0.exe` onto the client laptop (USB drive,
   email, whatever — it's just a file).
2. Double-click it. It installs like normal software and adds a desktop/
   Start Menu shortcut named "RMP HR System".
3. Open it from the shortcut — no browser, no typing in a URL, no internet
   needed for it to run.

## Trying it out without building an installer

If you just want to test it first without producing the .exe:
```
npm install
npm start
```
This opens the app in a window immediately, using the same local data file.

## Backing up your data

Your data lives in one file:
`%APPDATA%\RMP HR System\hr-data.json`
Copy that file elsewhere regularly (USB drive, external disk) as your
backup — if it's lost or the laptop dies, the data goes with it unless
you've copied this file out.

## If you ever want another laptop to have a COPY of the data

Since this is fully offline, there's no automatic sync between machines.
Copy the `hr-data.json` file from one laptop to the same folder on
another laptop (after installing the app there too) to bring the data
along. This is a manual, one-time copy — not live syncing.
