
# DND Player Companion 构建指南

## 1. 环境要求
- Windows x64 系统
- 安装有 Node.js (推荐 v18+)

## 2. 准备工作
在项目根目录运行以下命令安装开发依赖：
```bash
npm install
```

## 3. 开发模式
启动 Vite 开发服务器和 Electron 窗口（带热更新）：
```bash
npm run dev
```

## 4. 打包绿色版 (Portable)
一键构建前端产物并打包为 Windows x64 绿色版：
```bash
npm run package
```

## 5. 打包结果
构建完成后，在 `release/` 目录下可以找到：
- `DNDPlayerCompanion_1.5.0_Portable.exe`: 单个可执行文件，双击运行。
- `DNDPlayerCompanion-1.5.0-win.zip`: 解压即用的绿色包。

## 6. 注意事项
- 所有数据存储在浏览器的 LocalStorage 中，清理缓存会丢失数据（除非通过应用内的导出功能备份）。
- 打包过程不需要配置 C# 或 .NET 编译器。
