# Getting the Windows Installer — No Node.js Needed On Your Side

GitHub will do the actual building on their servers. You only need a free
GitHub account. Nothing gets installed on your computer or the client
laptop until you have the final .exe in hand.

## One-time setup

1. Go to https://github.com and create a free account (skip if you have one).
2. Click "+" (top right) → "New repository". Name it e.g. `rmp-hr-app`.
   Keep it Private if you don't want others seeing the code. Click
   "Create repository".
3. On the new repo's page, click "uploading an existing file" (or the
   "Add file" → "Upload files" button).
4. Drag in every file/folder from this `electron-app` folder, INCLUDING
   the hidden `.github` folder with the workflow file inside it. If
   GitHub's uploader hides dotfolders, use "Add file" → "Create new file",
   name it `.github/workflows/build.yml`, and paste in that file's
   contents instead.
5. Commit the files (green "Commit changes" button).

## Trigger the build

1. In your repo, click the "Actions" tab.
2. You should see a workflow called "Build Windows Installer". Click it.
3. Click "Run workflow" (dropdown button) → "Run workflow" again to confirm.
4. Wait 2–4 minutes. A green checkmark means it succeeded.

## Download your installer

1. Click on the completed workflow run.
2. Scroll down to "Artifacts".
3. Click "RMP-HR-System-Installer" to download a zip containing your
   `.exe` file.
4. Unzip it — that `.exe` is your real Windows installer.

## Installing on the client laptop

1. Copy the `.exe` onto the client laptop (USB drive, email, etc.).
2. Double-click it. It installs like any normal Windows program, with a
   desktop/Start Menu shortcut.
3. Open it from the shortcut. It runs fully offline from then on — no
   internet, no Node.js, nothing else needed on that laptop ever again.

## Notes

- Every time you change the app (add a feature, fix something), repeat
  "Trigger the build" above to get a new installer.
- Nothing in this process ever requires installing Node.js, Electron, or
  any build tool on your own computer or the client laptop — GitHub's
  cloud machines do all of that temporarily, then hand you the finished
  file.
- Your app's data never touches GitHub — only the source code files do.
  The actual HR data only ever lives in the installed app's local file on
  whichever laptop it's running on.
