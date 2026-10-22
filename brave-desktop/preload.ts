import { contextBridge, ipcRenderer } from 'electron';

export interface ShieldsData {
  enabled: boolean;
  blockedCount: number;
  domain: string;
  url: string;
}

export interface NavigationEvent {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  title: string;
  isLoading: boolean;
}

contextBridge.exposeInMainWorld('braveAPI', {
  navigate: (url: string) => ipcRenderer.send('browser:navigate', url),
  goBack: () => ipcRenderer.send('browser:go-back'),
  goForward: () => ipcRenderer.send('browser:go-forward'),
  reload: () => ipcRenderer.send('browser:reload'),
  toggleShields: (domain: string) => ipcRenderer.invoke('shields:toggle', domain),
  getShieldsStatus: (domain: string) => ipcRenderer.invoke('shields:get-status', domain),

  onShieldsUpdate: (callback: (data: ShieldsData) => void) => {
    ipcRenderer.on('shields:update', (_event, data) => callback(data));
  },
  onNavigationUpdate: (callback: (data: NavigationEvent) => void) => {
    ipcRenderer.on('browser:nav-update', (_event, data) => callback(data));
  },
});
