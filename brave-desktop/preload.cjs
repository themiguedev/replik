const { contextBridge, ipcRenderer } = require('electron');

let pathMod = null;
let urlMod = null;
try {
  pathMod = require('path');
} catch {}
try {
  urlMod = require('url');
} catch {}

function getLocalFileUrl(filename) {
  if (urlMod && pathMod && typeof __dirname === 'string') {
    try {
      return urlMod.pathToFileURL(pathMod.join(__dirname, 'ui', filename)).href;
    } catch {}
  }
  if (typeof window !== 'undefined' && window.location && window.location.href) {
    try {
      return new URL(filename, window.location.href).href;
    } catch {}
  }
  return `ui/${filename}`;
}

let cachedPrivatePartition = null;

contextBridge.exposeInMainWorld('braveAPI', {
  toggleShields: (domain) => ipcRenderer.invoke('shields:toggle', domain),
  toggleScripts: (domain) => ipcRenderer.invoke('shields:toggle-scripts', domain),
  toggleAggressive: (domain) => ipcRenderer.invoke('shields:toggle-aggressive', domain),
  toggleForgetful: (domain) => ipcRenderer.invoke('shields:toggle-forgetful', domain),
  clearDomainData: (domain) => ipcRenderer.invoke('shields:clear-domain-data', domain),
  clearBrowsingData: (options) => ipcRenderer.invoke('browser:clear-data', options),
  getShieldsStatus: (domain) => ipcRenderer.invoke('shields:get-status', domain),
  getSavingsStats: () => ipcRenderer.invoke('shields:get-savings-stats'),
  openWindow: (url) => ipcRenderer.invoke('browser:open-window', url),
  openPrivateWindow: (url) => ipcRenderer.invoke('browser:open-private-window', url),
  openTorWindow: (url) => ipcRenderer.invoke('browser:open-tor-window', url),
  getInitialUrl: () => {
    const prefix = '--initial-url=';
    const found = process.argv.find((a) => a.startsWith(prefix));
    return found ? found.slice(prefix.length) : null;
  },
  toggleFullScreen: () => ipcRenderer.invoke('browser:toggle-fullscreen'),
  isTorMode: () => process.argv.includes('--tor-mode'),
  isPrivateMode: () => process.argv.includes('--private-mode') || process.argv.includes('--tor-mode'),

  // Controles de Ventana Nativa / Frameless
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
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

  getNtpUrl: () => getLocalFileUrl('ntp.html'),
  getSettingsUrl: () => getLocalFileUrl('settings.html'),
  getHistoryUrl: () => getLocalFileUrl('history.html'),
  getDownloadsUrl: () => getLocalFileUrl('downloads.html'),
  getAdblockUrl: () => getLocalFileUrl('adblock.html'),
  getPlaylistUrl: () => getLocalFileUrl('playlist.html'),
  getExtensionsUrl: () => getLocalFileUrl('extensions.html'),
  getBookmarksUrl: () => getLocalFileUrl('bookmarks.html'),
  getVersionUrl: () => getLocalFileUrl('version.html'),
  getComponentsUrl: () => getLocalFileUrl('components.html'),
  getVersionInfo: () => ipcRenderer.invoke('browser:get-version-info'),
  updateBackendSetting: (key, value) => ipcRenderer.invoke('settings:update', key, value),
  getSitePermissions: (domain) => ipcRenderer.invoke('permissions:get', domain),
  setSitePermission: (domain, permission, state) => ipcRenderer.invoke('permissions:set', domain, permission, state),
  showSaveDialog: (options) => ipcRenderer.invoke('browser:save-dialog', options),
  writeFile: (filePath, base64Data) => ipcRenderer.invoke('browser:write-file', filePath, base64Data),
  createDesktopShortcut: (options) => ipcRenderer.invoke('browser:create-shortcut', options),
  createAppWindow: (options) => ipcRenderer.invoke('browser:open-app-window', options),
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
  openDownloadsFolder: () => ipcRenderer.invoke('browser:open-downloads-folder'),
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
      if (!cachedPrivatePartition) {
        cachedPrivatePartition = `temp_private_${process.pid}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      return cachedPrivatePartition;
    }
    return 'persist:brave_default';
  },
});
