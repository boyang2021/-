
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#020617', // 匹配项目的 slate-950 背景色
    title: "DND Player Companion",
    icon: path.join(__dirname, 'icon.ico'), // 如果有图标可以放置在此
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  // 隐藏原生菜单栏，提升沉浸感
  win.setMenuBarVisibility(false);

  // 加载项目入口
  win.loadFile('index.html');

  // 开发时可以开启调试工具
  // win.webContents.openDevTools();
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
