'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('prototypeDesktop', {
  version: '3.0.1',
  projectKey: 'prototype-editor-desktop-v3',
  choosePngSave: filename => ipcRenderer.invoke('prototype:choose-png', String(filename || '原型页面.png')),
  writePng: (token, bytes) => ipcRenderer.invoke('prototype:write-png', token, bytes)
});
