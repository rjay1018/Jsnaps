const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Listeners
  getOverlayData: () => ipcRenderer.invoke('GET_OVERLAY_DATA'),
  getEditorData: () => ipcRenderer.invoke('GET_EDITOR_DATA'),
  
  // Senders
  closeOverlay: () => ipcRenderer.send('CLOSE_OVERLAY'),
  openEditor: (data) => ipcRenderer.send('OPEN_EDITOR', data),
});
