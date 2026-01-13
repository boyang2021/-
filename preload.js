
const { contextBridge, ipcRenderer } = require('electron');

// 即使现在只用 localStorage，预留该接口以便未来扩展 IPC 通信
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  // 你可以在这里添加需要的系统级方法
});
