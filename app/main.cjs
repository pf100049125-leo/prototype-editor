'use strict';
const { app, BrowserWindow, Menu, ipcMain, dialog, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');
const { validatePng, safePngName } = require('./png-files.cjs');

const APP_ORIGIN = 'prototype-editor://editor';
const APP_URL = APP_ORIGIN + '/index.html';
protocol.registerSchemesAsPrivileged([{ scheme: 'prototype-editor', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
const profile = app.commandLine.getSwitchValue('user-data-dir');
if (profile) app.setPath('userData', path.resolve(profile));
else app.setPath('userData', path.join(app.getPath('appData'), 'PrototypeEditor-Desktop'));
app.setAppUserModelId('local.prototypeeditor.desktop');

let window;
const saves = new Map();
function requireEditor(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url.split('#')[0] !== APP_URL) throw Error('不允许的请求来源');
}
function purgeExpiredSaves() { for (const [id, value] of saves) if (Date.now() - value.created > 10 * 60 * 1000) saves.delete(id); }

ipcMain.handle('prototype:choose-png', async (event, filename) => {
  requireEditor(event); purgeExpiredSaves();
  const result = await dialog.showSaveDialog(window, {
    title: '保存原型页面图片', defaultPath: path.join(app.getPath('pictures'), safePngName(filename)),
    buttonLabel: '保存图片', filters: [{ name: 'PNG 图片', extensions: ['png'] }],
    properties: ['createDirectory', 'showOverwriteConfirmation']
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  const target = result.filePath.toLowerCase().endsWith('.png') ? result.filePath : result.filePath + '.png';
  const token = randomUUID(); saves.set(token, { path: target, created: Date.now() });
  return { canceled: false, token, name: path.basename(target) };
});
ipcMain.handle('prototype:write-png', async (event, token, bytes) => {
  requireEditor(event); purgeExpiredSaves();
  const target = saves.get(token); if (!target) throw Error('保存位置已过期，请重新选择');
  const data = validatePng(bytes); saves.delete(token);
  const temporary = path.join(path.dirname(target.path), '.' + path.basename(target.path) + '.' + token + '.tmp');
  try { await fs.writeFile(temporary, data, { flag: 'wx' }); await fs.rename(temporary, target.path); }
  catch (_) { try { await fs.unlink(temporary); } catch (_) {} throw Error('图片保存失败，请检查目标文件夹是否可写'); }
  return { name: path.basename(target.path) };
});

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    protocol.handle('prototype-editor', request => {
      const url = new URL(request.url);
      if (url.host !== 'editor' || !['/', '/index.html', '/icon.ico'].includes(url.pathname)) return new Response('Not found', { status: 404 });
      const name = url.pathname === '/icon.ico' ? 'icon.ico' : 'index.html';
      return net.fetch(pathToFileURL(path.join(__dirname, name)).href);
    });
    window = new BrowserWindow({
      width: 1680, height: 1040, minWidth: 1000, minHeight: 700,
      title: 'PrototypeEditor 1.0.1 · 原型编辑器', icon: path.join(__dirname, 'icon.ico'),
      show: false, autoHideMenuBar: true, backgroundColor: '#f4f5f7',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false }
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (url.split('#')[0] !== APP_URL) event.preventDefault(); });
    window.webContents.on('will-prevent-unload', event => {
      const choice = dialog.showMessageBoxSync(window, {
        type: 'warning', title: '退出原型编辑器', message: '工程有未保存的修改',
        detail: '选择“继续编辑”后，可使用“文件 → 保存工程”保留修改。选择“不保存并关闭”将丢弃尚未导出的工程修改。',
        buttons: ['继续编辑', '不保存并关闭'], defaultId: 0, cancelId: 0, noLink: true
      });
      // In Electron this permits the unload that the renderer tried to cancel.
      if (choice === 1) event.preventDefault();
    });
    window.once('ready-to-show', () => { window.maximize(); window.show(); });
    window.on('closed', () => { window = null; saves.clear(); });
    await window.loadURL(APP_URL);
  }).catch(error => { dialog.showErrorBox('原型编辑器启动失败', error.message); app.quit(); });
}
app.on('window-all-closed', () => app.quit());
