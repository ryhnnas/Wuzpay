const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "WUZPAY",
    icon: path.join(__dirname, 'public/logo.jpeg'), // Opsional kalau ada icon
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Karena masih LOKAL, Electron bakal nembak ke port Vite kamu
  win.loadURL(
    isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, 'dist/index.html')}`
  );

  // Menghilangkan menu bar (File, Edit, dll) biar kayak aplikasi asli
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});