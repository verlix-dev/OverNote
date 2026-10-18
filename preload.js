const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overnote', {
  loadState: () => ipcRenderer.invoke('load-state'),
  saveNotes: (notes) => ipcRenderer.invoke('save-notes', notes),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  setOpacity: (value) => ipcRenderer.invoke('set-opacity', value),
  setClickThrough: (enabled) => ipcRenderer.invoke('set-click-through', enabled),
  saveClipboardImage: () => ipcRenderer.invoke('save-clipboard-image'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  exportNote: (payload) => ipcRenderer.invoke('export-note', payload),
  hideWindow: () => ipcRenderer.send('hide-window'),
  quit: () => ipcRenderer.send('quit-app'),
  onInitialState: (callback) => ipcRenderer.on('initial-state', (_event, state) => callback(state)),
  onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', (_event, state) => callback(state)),
  onClickThroughChanged: (callback) => ipcRenderer.on('click-through-changed', (_event, enabled) => callback(enabled))
});
