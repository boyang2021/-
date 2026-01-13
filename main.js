
const { app, BrowserWindow } = require('electron');
const path = require('path');

// 判断是否是开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#020617',
    title: "DND Player Companion",
    webPreferences: {
      nodeIntegration: false, // 安全最佳实践：关闭
      contextIsolation: true, // 安全最佳实践：开启
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.setMenuBarVisibility(false);

  if (isDev) {
    // 开发环境：加载 Vite dev server
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // 开发时可选开启
  } else {
    // 生产环境：直接加载构建后的静态文件
    // 注意：由于 vite build 后 index.html 在 dist/ 下
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
