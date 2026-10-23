const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('braveAPI', {
  toggleShields: (domain) => ipcRenderer.invoke('shields:toggle', domain),
  toggleScripts: (domain) => ipcRenderer.invoke('shields:toggle-scripts', domain),
  toggleAggressive: (domain) => ipcRenderer.invoke('shields:toggle-aggressive', domain),
  toggleForgetful: (domain) => ipcRenderer.invoke('shields:toggle-forgetful', domain),
  clearDomainData: (domain) => ipcRenderer.invoke('shields:clear-domain-data', domain),
  clearBrowsingData: (options) => ipcRenderer.invoke('browser:clear-data', options),
  getShieldsStatus: (domain) => ipcRenderer.invoke('shields:get-status', domain),
  getSavingsStats: () => ipcRenderer.invoke('shields:get-savings-stats'),
  openPrivateWindow: () => ipcRenderer.invoke('browser:open-private-window'),
  openTorWindow: () => ipcRenderer.invoke('browser:open-tor-window'),
  toggleFullScreen: () => ipcRenderer.invoke('browser:toggle-fullscreen'),
  isTorMode: () => process.argv.includes('--tor-mode'),
  isPrivateMode: () => process.argv.includes('--private-mode') || process.argv.includes('--tor-mode'),

  // Controles de Ventana Nativa / Frameless
  minimizeWindow: () => {
    try { ipcRenderer.send('window:minimize-sync'); } catch {}
    return ipcRenderer.invoke('window:minimize');
  },
  maximizeWindow: () => {
    try { ipcRenderer.send('window:maximize-sync'); } catch {}
    return ipcRenderer.invoke('window:maximize');
  },
  closeWindow: () => {
    try { ipcRenderer.send('window:close-sync'); } catch {}
    return ipcRenderer.invoke('window:close');
  },
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowStateChanged: (callback) => {
    ipcRenderer.on('window:state-changed', (_event, data) => callback(data));
  },

  onShieldsUpdate: (callback) => {
    ipcRenderer.on('shields:update', (_event, data) => callback(data));
  },
  onWebviewShortcut: (callback) => {
    ipcRenderer.on('browser:webview-shortcut', (_event, data) => callback(data));
  },
  onContextMenu: (callback) => {
    ipcRenderer.on('browser:context-menu', (_event, data) => callback(data));
  },

  getNtpUrl: () => {
    return pathToFileURL(path.join(__dirname, 'ui', 'ntp.html')).href;
  },
  getSettingsUrl: () => {
    return pathToFileURL(path.join(__dirname, 'ui', 'settings.html')).href;
  },
  getHistoryUrl: () => {
    return pathToFileURL(path.join(__dirname, 'ui', 'history.html')).href;
  },
  getDownloadsUrl: () => {
    return pathToFileURL(path.join(__dirname, 'ui', 'downloads.html')).href;
  },
  getAdblockUrl: () => {
    return pathToFileURL(path.join(__dirname, 'ui', 'adblock.html')).href;
  },
  getPlaylistUrl: () => {
    return pathToFileURL(path.join(__dirname, 'ui', 'playlist.html')).href;
  },
  getExtensionsUrl: () => {
    return pathToFileURL(path.join(__dirname, 'ui', 'extensions.html')).href;
  },
  getBookmarksUrl: () => {
    return pathToFileURL(path.join(__dirname, 'ui', 'bookmarks.html')).href;
  },
  getVersionUrl: () => {
    return pathToFileURL(path.join(__dirname, 'ui', 'version.html')).href;
  },
  getVersionInfo: () => ipcRenderer.invoke('browser:get-version-info'),
  getSitePermissions: (domain) => ipcRenderer.invoke('permissions:get', domain),
  setSitePermission: (domain, permission, state) => ipcRenderer.invoke('permissions:set', domain, permission, state),
  showSaveDialog: (options) => ipcRenderer.invoke('browser:save-dialog', options),
  writeFile: (filePath, base64Data) => ipcRenderer.invoke('browser:write-file', filePath, base64Data),
  syncCustomRules: (rulesText) => ipcRenderer.invoke('shields:sync-custom-rules', rulesText),
  loadUnpackedExtension: () => ipcRenderer.invoke('extensions:load-unpacked'),
  listExtensions: () => ipcRenderer.invoke('extensions:list'),
  toggleExtension: (id, enabled) => ipcRenderer.invoke('extensions:toggle', id, enabled),
  removeExtension: (id) => ipcRenderer.invoke('extensions:remove', id),
  installPresetExtension: (presetId) => ipcRenderer.invoke('extensions:install-preset', presetId),
  downloadStoreExtension: (idOrUrl) => ipcRenderer.invoke('extensions:download-from-store', idOrUrl),

  // Pipeline de Descargas
  openPath: (filePath) => ipcRenderer.invoke('browser:open-path', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('browser:show-item-in-folder', filePath),
  cancelDownload: (id) => ipcRenderer.invoke('browser:cancel-download', id),
  onDownloadStarted: (callback) => ipcRenderer.on('download:started', (_e, data) => callback(data)),
  onDownloadProgress: (callback) => ipcRenderer.on('download:progress', (_e, data) => callback(data)),
  onDownloadCompleted: (callback) => ipcRenderer.on('download:completed', (_e, data) => callback(data)),
  onDownloadFailed: (callback) => ipcRenderer.on('download:failed', (_e, data) => callback(data)),

  // Autenticación HTTP Básica
  onAuthRequired: (callback) => ipcRenderer.on('browser:auth-required', (_e, data) => callback(data)),
  submitAuth: (authId, username, password, cancel) => ipcRenderer.invoke('browser:auth-response', { authId, username, password, cancel }),

  // Ratón, Teclas Multimedia y Caída de Pestañas
  onNavigateBack: (callback) => ipcRenderer.on('browser:navigate-back', () => callback()),
  onNavigateForward: (callback) => ipcRenderer.on('browser:navigate-forward', () => callback()),
  onMediaKey: (callback) => ipcRenderer.on('browser:media-key', (_e, cmd) => callback(cmd)),
  onTabCrashed: (callback) => ipcRenderer.on('browser:tab-crashed', (_e, data) => callback(data)),

  getSessionPartition: () => {
    const isPrivate = process.argv.includes('--private-mode') || process.argv.includes('--tor-mode');
    if (isPrivate) {
      return `temp_private_${process.pid}_${Math.random().toString(36).substring(2)}`;
    }
    return 'persist:brave_default';
  },
});
