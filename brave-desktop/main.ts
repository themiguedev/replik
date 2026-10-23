import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron';
import child_process from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BraveShieldsEngine } from '../brave-shields/src/shields-engine.js';
import { ResourceType } from '../brave-shields/src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = fs.existsSync(path.join(__dirname, 'preload.cjs'))
  ? __dirname
  : path.resolve(__dirname, '..');

let mainWindow: BrowserWindow | null = null;
const openWindows = new Set<BrowserWindow>();
const shieldsEngine = new BraveShieldsEngine();

// Shields per-domain configuration: Bloqueo de scripts activo por defecto
const shieldsDisabledDomains = new Set<string>();
const scriptAllowedDomains = new Set<string>([
  'search.brave.com',
  'brave.com',
  'youtube.com',
  'googlevideo.com',
  'ytimg.com',
  'ggpht.com',
  'localhost',
  '127.0.0.1',
]);
const scriptBlockedDomains = new Set<string>();
const aggressiveModeDomains = new Set<string>();
const forgetfulDomains = new Set<string>();

function isLocalOrPrivateIp(hostname: string): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local') || h.endsWith('.localhost')) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

function isDomainScriptBlocked(domain: string): boolean {
  if (!domain) return false;
  const d = domain.toLowerCase();
  // Sitios esenciales para reproducción multimedia y servicios internos: permitidos salvo bloqueo explícito
  if (
    d === 'localhost' ||
    d === '127.0.0.1' ||
    d.endsWith('youtube.com') ||
    d.endsWith('googlevideo.com') ||
    d.endsWith('ytimg.com') ||
    d.endsWith('ggpht.com') ||
    d.endsWith('brave.com')
  ) {
    return scriptBlockedDomains.has(d);
  }
  // Para cualquier otro sitio web, el bloqueo de scripts está ACTIVO por defecto
  return !scriptAllowedDomains.has(d);
}

// Track stats
const domainBlockedCounts = new Map<string, number>();
let totalGlobalBlocked = 0;

// Leer script de Farbling
let farblingScript = '';
try {
  farblingScript = fs.readFileSync(path.join(baseDir, 'farbling.js'), 'utf-8');
} catch {
  console.warn('[Brave-Replica] No se pudo leer farbling.js');
}

function getDomain(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.toLowerCase();
  } catch {
    return '';
  }
}

function initShieldsRules() {
  console.log('[Brave-Replica] Inicializando motor de protección Brave Shields...');

  // 1. Cargar reglas empaquetadas si existen (modo portable autónomo)
  const localRulesPath = path.join(baseDir, 'data', 'rules.txt');
  const localQueryPath = path.join(baseDir, 'data', 'query-filter.json');

  let loadedRules = false;

  if (fs.existsSync(localRulesPath)) {
    console.log(`[Brave-Replica] Cargando filtros empaquetados desde: ${localRulesPath}`);
    const raw = fs.readFileSync(localRulesPath, 'utf-8');
    const counts = shieldsEngine.loadRulesFromText(raw);
    console.log(
      `[Brave-Replica] Filtros cargados: ${counts.network} red, ${counts.cosmetic} cosméticas, ${counts.scriptlets} scriptlets.`
    );
    loadedRules = true;
  }

  // 2. Si no se cargó localmente, buscar dinámicamente la versión más reciente en Brave User Data
  if (!loadedRules) {
    const BRAVE_USER_DATA = path.join(
      process.env.LOCALAPPDATA || 'D:\\Usuarios\\UCE.FCBA\\AppData\\Local',
      'BraveSoftware',
      'Brave-Browser',
      'User Data'
    );
    const componentDir = path.join(BRAVE_USER_DATA, 'iodkpdagapdfkphljnddpjlldadblomo');
    if (fs.existsSync(componentDir)) {
      const versions = fs
        .readdirSync(componentDir)
        .filter((d) => fs.statSync(path.join(componentDir, d)).isDirectory());
      if (versions.length > 0) {
        const latest = versions.sort().pop()!;
        const listPath = path.join(componentDir, latest, 'list.txt');
        if (fs.existsSync(listPath)) {
          console.log(`[Brave-Replica] Cargando filtros desde instalación Brave (${latest}): ${listPath}`);
          const raw = fs.readFileSync(listPath, 'utf-8');
          const lines = raw.split(/\r?\n/).slice(0, 20000).join('\n');
          shieldsEngine.loadRulesFromText(lines);
          loadedRules = true;
        }
      }
    }
  }

  if (!loadedRules) {
    console.log('[Brave-Replica] Usando reglas integradas por defecto.');
    shieldsEngine.loadRulesFromText(`
      ||doubleclick.net^
      ||google-analytics.com^
      ||googlesyndication.com^
      ||adnxs.com^
      ||amazon-adsystem.com^
      ||adservice.google.com^
      ##.ad-banner
      ##.sponsored-post
      ###cookie-banner
    `);
  }

  // 3. Reglas avanzadas de bloqueo de avisos de cookies (Cookie Notice Blocker)
  shieldsEngine.loadRulesFromText(`
    ###cookie-banner
    ###cookie-notice
    ###onetrust-banner-sdk
    ##.cookie-banner
    ##.qc-cmp2-container
    ##[aria-label*="cookie" i]
    ###cmpbox
    ##.didomi-popup-container
    ##.cookie-law-info-bar
    ##.cc-banner
  `);

  // 4. Cargar Query Filter (Des-rastreo de URLs)
  if (fs.existsSync(localQueryPath)) {
    console.log(`[Brave-Replica] Cargando Query Filter empaquetado: ${localQueryPath}`);
    const queryRules = JSON.parse(fs.readFileSync(localQueryPath, 'utf-8'));
    shieldsEngine.loadQueryFilterRules(queryRules);
  } else {
    shieldsEngine.loadQueryFilterRules([
      {
        include: ['*://*/*'],
        exclude: [],
        params: ['fbclid', 'gclid', 'msclkid', 'utm_source', 'utm_medium', 'utm_campaign', 'si', 'igsh'],
      },
    ]);
  }

  // 5. Cargar Reglas Personalizadas y de Element Zapper
  try {
    const customRulesPath = path.join(app.getPath('userData'), 'custom-rules.txt');
    if (fs.existsSync(customRulesPath)) {
      const customRaw = fs.readFileSync(customRulesPath, 'utf-8');
      if (customRaw.trim()) {
        const counts = shieldsEngine.loadRulesFromText(customRaw);
        console.log(`[Brave-Replica] Reglas personalizadas persistentes cargadas: ${counts.cosmetic} cosméticas.`);
      }
    }
  } catch {}
}

// Des-Rastreo y Salto Directo de Redirecciones (Brave De-AMP & Direct URL Bypass)
function bypassTrackingRedirects(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();

    // 1. Redirecciones de búsqueda de Google (google.com/url?q=... o google.com/url?url=...)
    if ((host.includes('google.') || host === 'www.google.com') && u.pathname === '/url') {
      const q = u.searchParams.get('q') || u.searchParams.get('url');
      if (q && /^https?:\/\//i.test(q)) {
        return q;
      }
    }

    // 2. Caché de Google AMP y enlaces AMP (google.com/amp/s/example.com o ampproject.org)
    if ((host.includes('google.') || host.includes('ampproject.org')) && u.pathname.startsWith('/amp/')) {
      const parts = u.pathname.replace(/^\/amp\/(s\/)?/, '');
      if (parts) {
        return 'https://' + parts + u.search + u.hash;
      }
    }

    // 3. Redirecciones salientes de Reddit (out.reddit.com?url=...)
    if (host.includes('reddit.com') && u.pathname.includes('/out') && u.searchParams.has('url')) {
      const target = u.searchParams.get('url');
      if (target && /^https?:\/\//i.test(target)) return target;
    }

    // 4. Facebook Link Shim (l.facebook.com/l.php?u=...)
    if (host.includes('facebook.com') && u.pathname.includes('l.php') && u.searchParams.has('u')) {
      const target = u.searchParams.get('u');
      if (target && /^https?:\/\//i.test(target)) return target;
    }

    // 5. Instagram Link Shim (l.instagram.com/?u=...)
    if (host.includes('instagram.com') && u.searchParams.has('u')) {
      const target = u.searchParams.get('u');
      if (target && /^https?:\/\//i.test(target)) return target;
    }

    // 6. Envoltorios genéricos de redirección (href.li/?https://...)
    if (host.includes('href.li') && u.search.startsWith('?http')) {
      return u.search.substring(1);
    }

    return null;
  } catch {
    return null;
  }
}

// Registro de permisos granulares por sitio (Cámara, Micrófono, Notificaciones, etc.)
const sitePermissionsMap = new Map<string, Record<string, string>>();

function attachSessionInterception(targetSession: Electron.Session) {
  // Manejador nativo de solicitudes de permisos Web
  targetSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const url = details.requestingUrl || webContents.getURL();
    const domain = getDomain(url);
    const perms = sitePermissionsMap.get(domain) || {};
    let permKey = permission;
    if (permission === 'media') {
      permKey = details.mediaTypes?.includes('video') ? 'camera' : 'microphone';
    } else if (permission === 'clipboard-read' || permission === 'clipboard-sanitized-write') {
      permKey = 'clipboard';
    } else if (permission === 'notifications') {
      permKey = 'notifications';
    } else if (permission === 'geolocation') {
      permKey = 'geolocation';
    }

    if (perms[permKey] === 'block') {
      return callback(false);
    }
    if (perms[permKey] === 'allow') {
      return callback(true);
    }
    callback(true);
  });

  const filter = { urls: ['*://*/*'] };

  targetSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    const reqUrl = details.url;

    // 0. Resolución de protocolo descentralizado IPFS / IPNS
    if (reqUrl.startsWith('ipfs://')) {
      const cidPath = reqUrl.replace(/^ipfs:\/\//i, '');
      callback({ redirectURL: `https://dweb.link/ipfs/${cidPath}` });
      return;
    }
    if (reqUrl.startsWith('ipns://')) {
      const namePath = reqUrl.replace(/^ipns:\/\//i, '');
      callback({ redirectURL: `https://dweb.link/ipns/${namePath}` });
      return;
    }

    // 0.5 Protección y Whitelist de Infraestructura Esencial de Streaming (YouTube / Video Playback)
    const reqHost = getDomain(reqUrl);
    if (
      reqHost.endsWith('googlevideo.com') ||
      reqHost.endsWith('ytimg.com') ||
      reqHost.endsWith('ggpht.com') ||
      (reqHost.endsWith('youtube.com') && (
        reqUrl.includes('/youtubei/') ||
        reqUrl.includes('/api/stats/') ||
        reqUrl.includes('/get_video_info') ||
        reqUrl.includes('/videoplayback')
      ))
    ) {
      callback({ cancel: false });
      return;
    }

    const documentUrl = details.referrer || details.initiator || '';
    const docDomain = getDomain(documentUrl || reqUrl);

    // Si Shields está desactivado para este dominio, permitir todo
    if (shieldsDisabledDomains.has(docDomain)) {
      callback({ cancel: false });
      return;
    }

    // 0.8 HTTPS Everywhere Forzado: Actualizar HTTP a HTTPS para navegación principal
    if (details.resourceType === 'mainFrame' && reqUrl.startsWith('http://')) {
      const host = getDomain(reqUrl);
      if (!isLocalOrPrivateIp(host) && !host.endsWith('.test')) {
        const upgraded = reqUrl.replace(/^http:\/\//i, 'https://');
        console.log(`[Brave HTTPS Everywhere] Actualizado a conexión segura: ${reqUrl} -> ${upgraded}`);
        callback({ redirectURL: upgraded });
        return;
      }
    }

    // 0.9 Protección contra Escaneo de Red Local (LAN / Localhost Port Blocking)
    const initiatorHost = getDomain(details.initiator || details.referrer || '');
    const isInitiatorPublic = initiatorHost && !isLocalOrPrivateIp(initiatorHost) && !initiatorHost.startsWith('file');
    if (isInitiatorPublic && isLocalOrPrivateIp(reqHost)) {
      console.warn(`[Brave Shields] Escaneo de red local bloqueado desde ${initiatorHost} hacia ${reqHost}`);
      const current = domainBlockedCounts.get(docDomain) || 0;
      domainBlockedCounts.set(docDomain, current + 1);
      totalGlobalBlocked++;
      notifyShieldsUpdate(docDomain);
      callback({ cancel: true });
      return;
    }

    // 1. Des-Rastreo de URLs y Query Stripping: SOLO para la navegación principal (mainFrame)
    // Redirigir sub-recursos (XHR/Fetch/Media) corrompe llamadas SPA y genera errores "Sin conexión" en YouTube
    if (details.resourceType === 'mainFrame') {
      const bypassedUrl = bypassTrackingRedirects(reqUrl);
      if (bypassedUrl && bypassedUrl !== reqUrl) {
        console.log(`[Brave De-AMP] Salto directo activado: ${reqUrl} -> ${bypassedUrl}`);
        const current = domainBlockedCounts.get(docDomain) || 0;
        domainBlockedCounts.set(docDomain, current + 1);
        totalGlobalBlocked++;
        notifyShieldsUpdate(docDomain);
        callback({ redirectURL: bypassedUrl });
        return;
      }

      const cleaned = shieldsEngine.cleanUrl(reqUrl);
      if (cleaned.cleanUrl !== reqUrl) {
        const current = domainBlockedCounts.get(docDomain) || 0;
        domainBlockedCounts.set(docDomain, current + cleaned.strippedParams.length);
        totalGlobalBlocked += cleaned.strippedParams.length;
        notifyShieldsUpdate(docDomain);
        callback({ redirectURL: cleaned.cleanUrl });
        return;
      }

      callback({ cancel: false });
      return;
    }

    // Bloqueo de JavaScript: Activo por defecto con whitelist esencial y control por sitio
    if (details.resourceType === 'script' && isDomainScriptBlocked(docDomain)) {
      const current = domainBlockedCounts.get(docDomain) || 0;
      domainBlockedCounts.set(docDomain, current + 1);
      totalGlobalBlocked++;
      notifyShieldsUpdate(docDomain);
      callback({ cancel: true });
      return;
    }

    // 2. Mapeo del tipo de recurso
    let resType: ResourceType = 'other';
    switch (details.resourceType) {
      case 'script':
        resType = 'script';
        break;
      case 'image':
        resType = 'image';
        break;
      case 'stylesheet':
        resType = 'stylesheet';
        break;
      case 'xhr':
        resType = 'xmlhttprequest';
        break;
      case 'subFrame':
        resType = 'subdocument';
        break;
      case 'media':
        resType = 'media';
        break;
      case 'font':
        resType = 'font';
        break;
      case 'websocket':
        resType = 'websocket';
        break;
    }

    // 3. Evaluación de Bloqueo de Red
    const match = shieldsEngine.interceptRequest({
      url: reqUrl,
      documentUrl,
      resourceType: resType,
    });

    if (match.action === 'block') {
      const current = domainBlockedCounts.get(docDomain) || 0;
      domainBlockedCounts.set(docDomain, current + 1);
      totalGlobalBlocked++;
      notifyShieldsUpdate(docDomain);
      callback({ cancel: true });
      return;
    }

    if (match.action === 'redirect' && match.redirectDataUri) {
      const current = domainBlockedCounts.get(docDomain) || 0;
      domainBlockedCounts.set(docDomain, current + 1);
      totalGlobalBlocked++;
      notifyShieldsUpdate(docDomain);
      callback({ redirectURL: match.redirectDataUri });
      return;
    }

    callback({ cancel: false });
  });
}

function calculateSavings(blocked: number) {
  const mb = ((blocked * 34.2) / 1024).toFixed(1);
  const seconds = Math.round((blocked * 65) / 1000);
  const timeFormatted = seconds >= 60 ? `${(seconds / 60).toFixed(1)} min` : `${seconds} s`;
  return {
    bandwidthSavedMB: mb,
    timeSavedFormatted: timeFormatted,
    timeSavedSeconds: seconds,
  };
}

function notifyShieldsUpdate(domain: string) {
  const count = domainBlockedCounts.get(domain) || 0;
  const isEnabled = !shieldsDisabledDomains.has(domain);
  const siteSavings = calculateSavings(count);
  const globalSavings = calculateSavings(totalGlobalBlocked);

  const data = {
    enabled: isEnabled,
    blockedCount: count,
    domain,
    totalGlobal: totalGlobalBlocked,
    scriptsBlocked: isDomainScriptBlocked(domain),
    aggressive: aggressiveModeDomains.has(domain),
    forgetful: forgetfulDomains.has(domain),
    siteBandwidthMB: siteSavings.bandwidthSavedMB,
    siteTimeSaved: siteSavings.timeSavedFormatted,
    globalBandwidthMB: globalSavings.bandwidthSavedMB,
    globalTimeSaved: globalSavings.timeSavedFormatted,
  };

  for (const win of openWindows) {
    if (!win.isDestroyed()) {
      win.webContents.send('shields:update', data);
    }
  }
}

function createBrowserWindow(options: { isPrivate?: boolean; isTor?: boolean } = {}) {
  const isPrivate = options.isPrivate ?? false;
  const isTor = options.isTor ?? false;

  let title = 'Brave Browser';
  let backgroundColor = '#19191c';
  let modeArg = '--normal-mode';

  if (isTor) {
    title = 'Brave (Ventana Privada con Tor)';
    backgroundColor = '#140824';
    modeArg = '--tor-mode';
  } else if (isPrivate) {
    title = 'Brave (Ventana Privada)';
    backgroundColor = '#181124';
    modeArg = '--private-mode';
  }

  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    title,
    backgroundColor,
    icon: path.join(baseDir, 'ui', 'icon.ico'),
    show: false,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(baseDir, 'preload.cjs'),
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      additionalArguments: [modeArg],
    },
  });

  openWindows.add(win);
  if (!isPrivate && !isTor && !mainWindow) {
    mainWindow = win;
  }

  win.loadFile(path.join(baseDir, 'ui', 'index.html'));

  win.once('ready-to-show', () => {
    win.center();
    win.show();
    win.setAlwaysOnTop(true);
    win.focus();
    win.setAlwaysOnTop(false);
  });

  win.on('maximize', () => {
    if (!win.isDestroyed()) {
      win.webContents.send('window:state-changed', { isMaximized: true });
    }
  });

  win.on('unmaximize', () => {
    if (!win.isDestroyed()) {
      win.webContents.send('window:state-changed', { isMaximized: false });
    }
  });

  // Reenvío unificado de atajos de teclado globales (tanto de webviews como de la ventana principal)
  const forwardShortcut = (input: Electron.Input) => {
    if (input.type !== 'keyDown') return;
    const isCtrl = input.control || input.meta;
    const isShift = input.shift;
    const isAlt = input.alt;
    const code = input.code || '';
    const keyLower = (input.key || '').toLowerCase();

    const isT = code === 'KeyT' || keyLower === 't';
    const isW = code === 'KeyW' || keyLower === 'w';
    const isR = code === 'KeyR' || keyLower === 'r';
    const isL = code === 'KeyL' || keyLower === 'l';
    const isH = code === 'KeyH' || keyLower === 'h';
    const isJ = code === 'KeyJ' || keyLower === 'j';
    const isD = code === 'KeyD' || keyLower === 'd';
    const isB = code === 'KeyB' || keyLower === 'b';
    const isN = code === 'KeyN' || keyLower === 'n';
    const isA = code === 'KeyA' || keyLower === 'a';
    const isS = code === 'KeyS' || keyLower === 's';
    const isP = code === 'KeyP' || keyLower === 'p';
    const is0 = code === 'Digit0' || code === 'Numpad0' || keyLower === '0';
    const isTab = code === 'Tab' || keyLower === 'tab';
    const isEsc = code === 'Escape' || input.key === 'Escape';
    const isF4 = code === 'F4' || input.key === 'F4';
    const isF5 = code === 'F5' || input.key === 'F5';
    const isF6 = code === 'F6' || input.key === 'F6';
    const isF11 = code === 'F11' || input.key === 'F11';
    const isF12 = code === 'F12' || input.key === 'F12';
    const isDigit = code.startsWith('Digit') || code.startsWith('Numpad') || (keyLower >= '0' && keyLower <= '9');
    const isComma = code === 'Comma' || keyLower === ',';
    const isF = code === 'KeyF' || keyLower === 'f';
    const isZoom = code === 'Equal' || code === 'Minus' || code === 'NumpadAdd' || code === 'NumpadSubtract' || keyLower === '+' || keyLower === '-' || keyLower === '=';
    const isPage = code === 'PageDown' || code === 'PageUp' || keyLower === 'pagedown' || keyLower === 'pageup';
    const isDelete = code === 'Delete' || code === 'Backspace' || keyLower === 'delete' || keyLower === 'backspace';
    const isE = code === 'KeyE' || keyLower === 'e';

    if (
      (isCtrl && (isT || isW || isR || isL || isH || isJ || isD || isB || isN || isA || isF || isP || isTab || isF4 || isDigit || isComma || isZoom || is0 || isPage)) ||
      (isCtrl && isShift && (isT || isS || isN || isB || isDelete || isE)) ||
      (isAlt && (isD || isS || isR || (isShift && isN))) ||
      (isShift && isEsc) ||
      isEsc ||
      isF5 ||
      isF6 ||
      isF11 ||
      isF12
    ) {
      if (!win.isDestroyed()) {
        win.webContents.send('browser:webview-shortcut', {
          key: input.key,
          code: input.code,
          ctrlKey: input.control,
          shiftKey: input.shift,
          altKey: input.alt,
          metaKey: input.meta,
        });
      }
    }
  };

  win.webContents.on('before-input-event', (_e, input) => {
    forwardShortcut(input);
  });

  // Inyección de Farbling y Estilos Cosméticos en cada Webview
  win.webContents.on('did-attach-webview', (_event, webContents) => {
    // Aceleración y supresión nativa de segundo plano (Background Tab Throttling)
    webContents.setBackgroundThrottling(true);

    // Reenvío de atajos de teclado globales desde el Webview a la ventana principal
    webContents.on('before-input-event', (_e, input) => {
      forwardShortcut(input);
    });

    // Detección de Caída de Proceso (Crash Recovery)
    webContents.on('render-process-gone', (_e, details) => {
      if (!win.isDestroyed()) {
        win.webContents.send('browser:tab-crashed', {
          webContentsId: webContents.id,
          reason: details.reason,
          exitCode: details.exitCode,
        });
      }
    });

    webContents.on('context-menu', (_e, params) => {
      if (!win.isDestroyed()) {
        win.webContents.send('browser:context-menu', params);
      }
    });

    webContents.on('dom-ready', () => {
      // 1. Farbling Anti-Fingerprinting
      if (farblingScript) {
        webContents.executeJavaScript(farblingScript).catch(() => {});
      }

      // 2. Ocultación Cosmética CSS
      const pageUrl = webContents.getURL();
      const domain = getDomain(pageUrl);
      if (!domain || shieldsDisabledDomains.has(domain)) return;

      const { css } = shieldsEngine.injectCosmetics(domain);
      if (css) {
        webContents.insertCSS(css).catch(() => {});
      }
    });
  });

  // Botones laterales del ratón (Mouse 4 = Atrás, Mouse 5 = Adelante) y Controles Multimedia
  win.on('app-command', (_e, cmd) => {
    if (cmd === 'browser-backward') {
      win.webContents.send('browser:navigate-back');
    } else if (cmd === 'browser-forward') {
      win.webContents.send('browser:navigate-forward');
    } else if (
      cmd === 'media-play-pause' ||
      cmd === 'media-stop' ||
      cmd === 'media-next-track' ||
      cmd === 'media-previous-track'
    ) {
      win.webContents.send('browser:media-key', cmd);
    }
  });

  win.on('closed', () => {
    openWindows.delete(win);
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  return win;
}

// IPC Handlers
ipcMain.handle('shields:get-status', (_event, domain: string) => {
  const cleanDomain = domain.toLowerCase();
  const count = domainBlockedCounts.get(cleanDomain) || 0;
  const siteSavings = calculateSavings(count);
  const globalSavings = calculateSavings(totalGlobalBlocked);

  return {
    enabled: !shieldsDisabledDomains.has(cleanDomain),
    blockedCount: count,
    domain: cleanDomain,
    totalGlobal: totalGlobalBlocked,
    scriptsBlocked: isDomainScriptBlocked(cleanDomain),
    aggressive: aggressiveModeDomains.has(cleanDomain),
    forgetful: forgetfulDomains.has(cleanDomain),
    siteBandwidthMB: siteSavings.bandwidthSavedMB,
    siteTimeSaved: siteSavings.timeSavedFormatted,
    globalBandwidthMB: globalSavings.bandwidthSavedMB,
    globalTimeSaved: globalSavings.timeSavedFormatted,
  };
});

ipcMain.handle('shields:toggle-forgetful', (_event, domain: string) => {
  const cleanDomain = domain.toLowerCase();
  if (forgetfulDomains.has(cleanDomain)) {
    forgetfulDomains.delete(cleanDomain);
  } else {
    forgetfulDomains.add(cleanDomain);
  }
  notifyShieldsUpdate(cleanDomain);
  return {
    forgetful: forgetfulDomains.has(cleanDomain),
  };
});

ipcMain.handle('shields:clear-domain-data', async (_event, domain: string) => {
  if (!domain) return { success: false };
  const clean = domain.toLowerCase();
  try {
    const filter = {
      origin: `https://${clean}`,
      storages: ['cookies', 'localstorage', 'sessionstorage', 'cachestorage', 'websql', 'indexdb', 'serviceworkers'],
    };
    await session.defaultSession.clearStorageData(filter as any);
    const persistSession = session.fromPartition('persist:brave_default');
    await persistSession.clearStorageData(filter as any);
    console.log(`[Brave Forgetful] Datos y cookies eliminados para: ${clean}`);
    return { success: true };
  } catch (err: any) {
    console.warn(`[Brave Forgetful] Error limpiando datos de ${clean}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('browser:clear-data', async (_event, options: { timeRange?: string; dataTypes?: string[] }) => {
  const { timeRange = 'all', dataTypes = ['cache', 'cookies', 'storage', 'history'] } = options || {};
  let since = 0;
  const now = Date.now();
  if (timeRange === '1h') since = now - 60 * 60 * 1000;
  else if (timeRange === '24h') since = now - 24 * 60 * 60 * 1000;
  else if (timeRange === '7d') since = now - 7 * 24 * 60 * 60 * 1000;
  else if (timeRange === '4w') since = now - 28 * 24 * 60 * 60 * 1000;

  try {
    const partitions = [session.defaultSession, session.fromPartition('persist:brave_default')];
    for (const s of partitions) {
      if (dataTypes.includes('cache')) {
        await s.clearCache().catch(() => {});
      }
      const storagesToClear: any[] = [];
      if (dataTypes.includes('cookies')) storagesToClear.push('cookies');
      if (dataTypes.includes('storage')) {
        storagesToClear.push('localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage');
      }
      if (storagesToClear.length > 0) {
        const filter: any = { storages: storagesToClear };
        if (since > 0) filter.since = since;
        await s.clearStorageData(filter).catch(() => {});
      }
    }
    console.log(`[Brave Privacy] Datos de navegación limpiados: rango=${timeRange}, tipos=${dataTypes.join(',')}`);
    return { success: true };
  } catch (err: any) {
    console.warn('[Brave Privacy] Error en browser:clear-data:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shields:get-savings-stats', () => {
  const globalSavings = calculateSavings(totalGlobalBlocked);
  return {
    totalBlocked: totalGlobalBlocked,
    globalBandwidthMB: globalSavings.bandwidthSavedMB,
    globalTimeSaved: globalSavings.timeSavedFormatted,
  };
});

ipcMain.handle('shields:toggle', (_event, domain: string) => {
  const cleanDomain = domain.toLowerCase();
  if (shieldsDisabledDomains.has(cleanDomain)) {
    shieldsDisabledDomains.delete(cleanDomain);
  } else {
    shieldsDisabledDomains.add(cleanDomain);
  }
  notifyShieldsUpdate(cleanDomain);
  return {
    enabled: !shieldsDisabledDomains.has(cleanDomain),
  };
});

ipcMain.handle('shields:toggle-scripts', (_event, domain: string) => {
  const cleanDomain = domain.toLowerCase();
  const currentlyBlocked = isDomainScriptBlocked(cleanDomain);
  if (currentlyBlocked) {
    scriptAllowedDomains.add(cleanDomain);
    scriptBlockedDomains.delete(cleanDomain);
  } else {
    scriptBlockedDomains.add(cleanDomain);
    scriptAllowedDomains.delete(cleanDomain);
  }
  notifyShieldsUpdate(cleanDomain);
  return {
    scriptsBlocked: isDomainScriptBlocked(cleanDomain),
  };
});

ipcMain.handle('shields:toggle-aggressive', (_event, domain: string) => {
  const cleanDomain = domain.toLowerCase();
  if (aggressiveModeDomains.has(cleanDomain)) {
    aggressiveModeDomains.delete(cleanDomain);
  } else {
    aggressiveModeDomains.add(cleanDomain);
  }
  notifyShieldsUpdate(cleanDomain);
  return {
    aggressive: aggressiveModeDomains.has(cleanDomain),
  };
});

ipcMain.handle('browser:open-private-window', () => {
  createBrowserWindow({ isPrivate: true });
});

ipcMain.handle('browser:open-tor-window', () => {
  createBrowserWindow({ isPrivate: true, isTor: true });
});

ipcMain.handle('browser:toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setFullScreen(!win.isFullScreen());
  }
});

function getTargetWindow(event?: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): BrowserWindow | null {
  if (event && event.sender) {
    const fromSender = BrowserWindow.fromWebContents(event.sender);
    if (fromSender && !fromSender.isDestroyed()) return fromSender;
  }
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  for (const win of openWindows) {
    if (!win.isDestroyed()) return win;
  }
  return null;
}

// Controles de Ventana (Frameless Titlebar)
const handleWindowMinimize = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) => {
  const win = getTargetWindow(event);
  if (win && !win.isDestroyed()) {
    win.minimize();
  }
};

const handleWindowMaximize = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): boolean => {
  const win = getTargetWindow(event);
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    return win.isMaximized();
  }
  return false;
};

const handleWindowClose = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) => {
  const win = getTargetWindow(event);
  if (win && !win.isDestroyed()) {
    win.close();
  }
};

ipcMain.handle('window:minimize', handleWindowMinimize);
ipcMain.on('window:minimize', handleWindowMinimize);
ipcMain.on('window:minimize-sync', handleWindowMinimize);

ipcMain.handle('window:maximize', handleWindowMaximize);
ipcMain.on('window:maximize', handleWindowMaximize);
ipcMain.on('window:maximize-sync', handleWindowMaximize);

ipcMain.handle('window:close', handleWindowClose);
ipcMain.on('window:close', handleWindowClose);
ipcMain.on('window:close-sync', handleWindowClose);

ipcMain.handle('window:is-maximized', (event) => {
  const win = getTargetWindow(event);
  return win && !win.isDestroyed() ? win.isMaximized() : false;
});

// IPC para Permisos Granulares de Sitio
ipcMain.handle('permissions:get', (_event, domain: string) => {
  return sitePermissionsMap.get(domain) || {};
});

ipcMain.handle('permissions:set', (_event, domain: string, permission: string, state: string) => {
  if (!sitePermissionsMap.has(domain)) {
    sitePermissionsMap.set(domain, {});
  }
  const perms = sitePermissionsMap.get(domain)!;
  if (state === 'reset') {
    delete perms[permission];
  } else {
    perms[permission] = state;
  }
  return perms;
});

// Diálogos nativos y guardado de archivos (Captura y PDF)
ipcMain.handle('browser:save-dialog', async (event, options: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
  const win = getTargetWindow(event);
  if (!win) return { canceled: true };
  return dialog.showSaveDialog(win, options);
});

ipcMain.handle('browser:write-file', async (_event, filePath: string, base64Data: string) => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
});

// ========================================================
// PIPELINE NATIVO DE DESCARGAS (Download Pipeline)
// ========================================================
ipcMain.handle('browser:open-path', async (_event, filePath: string) => {
  if (!filePath || !fs.existsSync(filePath)) return { success: false, error: 'Archivo no encontrado' };
  try {
    const err = await shell.openPath(filePath);
    return { success: !err, error: err };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
});

ipcMain.handle('browser:show-item-in-folder', (_event, filePath: string) => {
  if (!filePath || !fs.existsSync(filePath)) return { success: false };
  shell.showItemInFolder(filePath);
  return { success: true };
});

const activeDownloadsMap = new Map<string, Electron.DownloadItem>();

ipcMain.handle('browser:cancel-download', (_event, downloadId: string) => {
  const item = activeDownloadsMap.get(downloadId);
  if (item) {
    item.cancel();
    activeDownloadsMap.delete(downloadId);
    return { success: true };
  }
  return { success: false, error: 'Descarga no encontrada o ya finalizada' };
});

ipcMain.handle('browser:get-version-info', () => {
  return {
    braveVersion: '1.3.0',
    chromiumVersion: process.versions.chrome || '120.0.6099.109',
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    v8Version: process.versions.v8,
    osPlatform: process.platform,
    osArch: process.arch,
    osRelease: os.release(),
    userAgent: session.defaultSession.getUserAgent(),
    execPath: process.execPath,
    userDataPath: app.getPath('userData'),
    commandLine: process.argv.join(' '),
  };
});

function attachDownloadHandler(ses: Electron.Session) {
  ses.on('will-download', (_event, item, webContents) => {
    const filename = item.getFilename();
    const totalBytes = item.getTotalBytes();
    const downloadId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const savePath = path.join(app.getPath('downloads'), filename);
    item.setSavePath(savePath);
    activeDownloadsMap.set(downloadId, item);

    const win = BrowserWindow.fromWebContents(webContents.isDestroyed() ? mainWindow! : webContents.getOwnerBrowserWindow() || mainWindow!);

    if (win && !win.isDestroyed()) {
      win.webContents.send('download:started', {
        id: downloadId,
        filename,
        totalBytes,
        savePath,
      });
    }

    item.on('updated', (_evt, state) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('download:progress', {
          id: downloadId,
          filename,
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes(),
          state,
        });
      }
    });

    item.once('done', (_evt, state) => {
      activeDownloadsMap.delete(downloadId);
      if (win && !win.isDestroyed()) {
        if (state === 'completed') {
          win.webContents.send('download:completed', {
            id: downloadId,
            filename,
            savePath,
            totalBytes: item.getTotalBytes(),
          });
        } else {
          win.webContents.send('download:failed', {
            id: downloadId,
            filename,
            state,
          });
        }
      }
    });
  });
}

// ========================================================
// AUTENTICACIÓN HTTP BÁSICA (HTTP Basic Auth)
// ========================================================
const pendingAuthCallbacks = new Map<string, (username?: string, password?: string) => void>();

app.on('login', (event, webContents, request, authInfo, callback) => {
  event.preventDefault();
  const authId = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  pendingAuthCallbacks.set(authId, callback);

  const win = BrowserWindow.fromWebContents(webContents.isDestroyed() ? mainWindow! : webContents.getOwnerBrowserWindow() || mainWindow!);
  if (win && !win.isDestroyed()) {
    win.webContents.send('browser:auth-required', {
      authId,
      host: authInfo.host,
      realm: authInfo.realm,
      url: request.url,
      port: authInfo.port,
    });
  } else {
    callback(); // cancel
  }
});

ipcMain.handle('browser:auth-response', (_event, { authId, username, password, cancel }: { authId: string; username?: string; password?: string; cancel?: boolean }) => {
  const cb = pendingAuthCallbacks.get(authId);
  if (cb) {
    pendingAuthCallbacks.delete(authId);
    if (cancel) {
      cb();
    } else {
      cb(username, password);
    }
  }
  return { success: true };
});

// Extensiones y Reglas Personalizadas
interface ExtensionMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  path: string;
  icon?: string;
  homepage?: string;
}

const PRESET_EXTENSIONS: Record<string, { name: string; desc: string; icon: string; url: string; crxId: string }> = {
  'dark-reader': {
    name: 'Dark Reader',
    desc: 'Modo oscuro avanzado para toda la web con ajuste de brillo y contraste.',
    icon: '🌙',
    url: 'https://chromewebstore.google.com/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh',
    crxId: 'eimadpbcbfnmbkopoojfekhnkhdbieeh',
  },
  'bitwarden': {
    name: 'Bitwarden - Gestor de Contraseñas',
    desc: 'Gestor de contraseñas seguro y de código abierto para todas tus cuentas.',
    icon: '🛡️',
    url: 'https://chromewebstore.google.com/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb',
    crxId: 'nngceckbapebfimnlniiiahkandclblb',
  },
  'ublock-origin': {
    name: 'uBlock Origin',
    desc: 'Un eficiente bloqueador de amplio espectro que ahorra memoria y CPU.',
    icon: '🧱',
    url: 'https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm',
    crxId: 'cjpalhdlnbpafiamejdnhcphjbkeiagm',
  },
  'tampermonkey': {
    name: 'Tampermonkey',
    desc: 'El gestor de scripts de usuario más popular para personalizar páginas web.',
    icon: '🐒',
    url: 'https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkmingnoiobehalkhgimobgahj',
    crxId: 'dhdgffkkmingnoiobehalkhgimobgahj',
  },
  'ipfs-companion': {
    name: 'IPFS Companion',
    desc: 'Facilita el acceso a la web distribuida IPFS desde el navegador.',
    icon: '🪐',
    url: 'https://chromewebstore.google.com/detail/ipfs-companion/nibjojkomfdiaoajekgbflgcppfdcdal',
    crxId: 'nibjojkomfdiaoajekgbflgcppfdcdal',
  },
};

function getExtensionsFilePath(): string {
  return path.join(app.getPath('userData'), 'extensions.json');
}

function loadInstalledExtensionsList(): ExtensionMeta[] {
  try {
    const f = getExtensionsFilePath();
    if (fs.existsSync(f)) {
      return JSON.parse(fs.readFileSync(f, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveInstalledExtensionsList(list: ExtensionMeta[]): void {
  try {
    fs.writeFileSync(getExtensionsFilePath(), JSON.stringify(list, null, 2), 'utf-8');
  } catch {}
}

async function loadExtensionInAllSessions(extPath: string): Promise<Electron.Extension | null> {
  let loaded: Electron.Extension | null = null;
  try {
    loaded = await session.defaultSession.loadExtension(extPath, { allowFileAccess: true });
    console.log(`[Brave Extensions] Cargada en defaultSession: ${extPath}`);
  } catch (err) {
    console.warn(`[Brave Extensions] Error en defaultSession:`, err);
  }

  try {
    const persistSession = session.fromPartition('persist:brave_default');
    const pLoaded = await persistSession.loadExtension(extPath, { allowFileAccess: true });
    console.log(`[Brave Extensions] Cargada en persist:brave_default: ${extPath}`);
    if (!loaded) loaded = pLoaded;
  } catch (err) {
    console.warn(`[Brave Extensions] Error en persistSession:`, err);
  }
  return loaded;
}

function removeExtensionFromAllSessions(extId: string): void {
  try {
    session.defaultSession.removeExtension(extId);
  } catch {}
  try {
    const persistSession = session.fromPartition('persist:brave_default');
    persistSession.removeExtension(extId);
  } catch {}
}

function downloadCrxAsZipBuffer(urlStr: string, redirects = 0): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (redirects > 6) return reject(new Error('Demasiadas redirecciones al descargar la extensión'));
    https.get(urlStr, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadCrxAsZipBuffer(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Servidor de extensiones devolvió código ${res.statusCode}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const fullBuf = Buffer.concat(chunks);
        const zipSig = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
        const offset = fullBuf.indexOf(zipSig);
        if (offset === -1) {
          return reject(new Error('Formato no reconocido: no se encontró archivo ZIP válido en el paquete descargado.'));
        }
        resolve(fullBuf.subarray(offset));
      });
    }).on('error', (err) => reject(err));
  });
}

async function initExtensions() {
  const list = loadInstalledExtensionsList();
  for (const ext of list) {
    if (ext.enabled && ext.path && fs.existsSync(ext.path)) {
      try {
        await loadExtensionInAllSessions(ext.path);
        console.log(`[Brave Extensions] Extensión restaurada: ${ext.name} (${ext.id})`);
      } catch (err) {
        console.warn(`[Brave Extensions] Error cargando extensión ${ext.name}:`, err);
      }
    }
  }
}

// Sincronización de Reglas Personalizadas de Adblock / Element Zapper
ipcMain.handle('shields:sync-custom-rules', (_event, rulesText: string) => {
  if (rulesText && typeof rulesText === 'string') {
    shieldsEngine.loadRulesFromText(rulesText);
    try {
      const customRulesPath = path.join(app.getPath('userData'), 'custom-rules.txt');
      fs.writeFileSync(customRulesPath, rulesText, 'utf-8');
      console.log('[Brave-Replica] Reglas personalizadas sincronizadas y persistidas.');
    } catch {}
  }
  return { success: true };
});

// Gestor de Extensiones IPC
ipcMain.handle('extensions:list', async () => {
  const installed = loadInstalledExtensionsList();
  return {
    installed,
    presets: PRESET_EXTENSIONS,
  };
});

ipcMain.handle('extensions:load-unpacked', async (event) => {
  const win = getTargetWindow(event);
  const result = await dialog.showOpenDialog(win || undefined, {
    title: 'Seleccionar carpeta de la extensión descomprimida (con manifest.json)',
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const extDir = result.filePaths[0];
  const manifestPath = path.join(extDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { error: 'No se encontró el archivo manifest.json en la carpeta seleccionada.' };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const loaded = await loadExtensionInAllSessions(extDir);

    const extItem: ExtensionMeta = {
      id: loaded ? loaded.id : path.basename(extDir),
      name: manifest.name || (loaded ? loaded.name : path.basename(extDir)),
      version: manifest.version || '1.0.0',
      description: manifest.description || 'Extensión personalizada cargada localmente',
      enabled: true,
      path: extDir,
      icon: '🧩',
    };

    const list = loadInstalledExtensionsList();
    const existingIdx = list.findIndex((e) => e.id === extItem.id || e.path === extDir);
    if (existingIdx !== -1) {
      list[existingIdx] = extItem;
    } else {
      list.push(extItem);
    }
    saveInstalledExtensionsList(list);

    return { success: true, extension: extItem };
  } catch (err: any) {
    return { error: err.message || 'Error al cargar la extensión.' };
  }
});

ipcMain.handle('extensions:toggle', async (_event, extId: string, enabled: boolean) => {
  const list = loadInstalledExtensionsList();
  const target = list.find((e) => e.id === extId);
  if (!target) return { error: 'Extensión no encontrada' };

  target.enabled = enabled;
  if (!enabled) {
    removeExtensionFromAllSessions(extId);
  } else if (target.path && fs.existsSync(target.path)) {
    try {
      await loadExtensionInAllSessions(target.path);
    } catch {}
  }
  saveInstalledExtensionsList(list);
  return { success: true, enabled: target.enabled };
});

ipcMain.handle('extensions:remove', async (_event, extId: string) => {
  let list = loadInstalledExtensionsList();
  const target = list.find((e) => e.id === extId);
  if (target) {
    removeExtensionFromAllSessions(extId);
    list = list.filter((e) => e.id !== extId);
    saveInstalledExtensionsList(list);
  }
  return { success: true };
});

ipcMain.handle('extensions:install-preset', async (_event, presetKey: string) => {
  const preset = PRESET_EXTENSIONS[presetKey];
  if (!preset) return { error: 'Preset no encontrado' };

  const extDir = path.join(app.getPath('userData'), 'extensions', presetKey);
  fs.mkdirSync(extDir, { recursive: true });

  const manifest: any = {
    manifest_version: 3,
    name: preset.name,
    version: '1.0.0',
    description: preset.desc,
    action: {},
    permissions: ['activeTab', 'storage'],
  };

  if (presetKey === 'dark-reader') {
    manifest.content_scripts = [
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_start',
      },
    ];
    const scriptContent = `
      (function() {
        if (window.__brave_dr_applied) return;
        window.__brave_dr_applied = true;
        const s = document.createElement('style');
        s.id = 'brave-preset-darkreader';
        s.textContent = 'html { filter: invert(90%) hue-rotate(180deg) !important; background: #121212 !important; } img, video, canvas, svg { filter: invert(100%) hue-rotate(180deg) !important; }';
        (document.head || document.documentElement).appendChild(s);
      })();
    `;
    fs.writeFileSync(path.join(extDir, 'content.js'), scriptContent, 'utf-8');
  } else if (presetKey === 'ublock-origin') {
    manifest.content_scripts = [
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_start',
      },
    ];
    const scriptContent = `
      (function() {
        const s = document.createElement('style');
        s.id = 'brave-preset-ublock';
        s.textContent = '.ad, .ads, .advertisement, [id*="google_ads"], [class*="sponsored"], [class*="ad-banner"] { display: none !important; }';
        (document.head || document.documentElement).appendChild(s);
      })();
    `;
    fs.writeFileSync(path.join(extDir, 'content.js'), scriptContent, 'utf-8');
  }

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  try {
    const loaded = await loadExtensionInAllSessions(extDir);
    const extItem: ExtensionMeta = {
      id: loaded ? loaded.id : presetKey,
      name: preset.name,
      version: '1.0.0',
      description: preset.desc,
      enabled: true,
      path: extDir,
      icon: preset.icon,
      homepage: preset.url,
    };
    const list = loadInstalledExtensionsList();
    const existingIdx = list.findIndex((e) => e.id === extItem.id || e.path === extDir);
    if (existingIdx !== -1) {
      list[existingIdx] = extItem;
    } else {
      list.push(extItem);
    }
    saveInstalledExtensionsList(list);
    return { success: true, extension: extItem };
  } catch (err: any) {
    return { error: err.message || 'Error al instalar extensión' };
  }
});

ipcMain.handle('extensions:download-from-store', async (_event, inputStr: string) => {
  if (!inputStr || typeof inputStr !== 'string') {
    return { error: 'Por favor ingresa una URL o ID válida de Chrome Web Store.' };
  }

  const match = inputStr.trim().match(/([a-p]{32})/i);
  if (!match) {
    return { error: 'No se detectó un ID de extensión válido (32 caracteres alfabéticos a-p) en el texto ingresado.' };
  }
  const extId = match[1].toLowerCase();

  try {
    const downloadDir = path.join(app.getPath('userData'), 'extensions', extId);
    fs.mkdirSync(downloadDir, { recursive: true });

    const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0.0.0&acceptformat=crx2,crx3&x=id%3D${extId}%26uc`;
    console.log(`[Brave Extensions] Descargando desde Chrome Web Store: ${crxUrl}`);

    const zipBuffer = await downloadCrxAsZipBuffer(crxUrl);
    const tempZipPath = path.join(app.getPath('userData'), `temp_${extId}.zip`);
    fs.writeFileSync(tempZipPath, zipBuffer);

    try {
      child_process.execSync(`tar -xf "${tempZipPath}" -C "${downloadDir}"`, { stdio: 'ignore' });
    } catch (tarErr: any) {
      return { error: 'Error al descomprimir paquete de extensión: ' + tarErr.message };
    } finally {
      try { fs.unlinkSync(tempZipPath); } catch {}
    }

    const manifestPath = path.join(downloadDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return { error: 'El paquete descargado no contiene un archivo manifest.json válido.' };
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const loaded = await loadExtensionInAllSessions(downloadDir);

    const extItem: ExtensionMeta = {
      id: loaded ? loaded.id : extId,
      name: manifest.name || path.basename(downloadDir),
      version: manifest.version || '1.0.0',
      description: manifest.description || 'Extensión descargada de Chrome Web Store',
      enabled: true,
      path: downloadDir,
      icon: '🧩',
      homepage: `https://chromewebstore.google.com/detail/${extId}`,
    };

    const list = loadInstalledExtensionsList();
    const existingIdx = list.findIndex((e) => e.id === extItem.id || e.path === downloadDir);
    if (existingIdx !== -1) {
      list[existingIdx] = extItem;
    } else {
      list.push(extItem);
    }
    saveInstalledExtensionsList(list);

    return { success: true, extension: extItem };
  } catch (err: any) {
    return { error: err.message || 'Error durante la descarga o instalación.' };
  }
});

app.whenReady().then(async () => {
  initShieldsRules();
  await initExtensions();

  // Configuración de User-Agent auténtico tipo Chrome/Brave (evita detección de Electron en YouTube/Google)
  const defaultUA = session.defaultSession.getUserAgent();
  const cleanUA = defaultUA
    .replace(/Electron\/[0-9.]+\s?/g, '')
    .replace(/brave-replica\/[0-9.]+\s?/gi, '')
    .trim();

  session.defaultSession.setUserAgent(cleanUA);
  const persistSession = session.fromPartition('persist:brave_default');
  persistSession.setUserAgent(cleanUA);

  attachSessionInterception(session.defaultSession);
  attachSessionInterception(persistSession);
  attachDownloadHandler(session.defaultSession);
  attachDownloadHandler(persistSession);

  // Interceptar automáticamente cualquier nueva sesión (incluyendo privadas en RAM) y cargar extensiones activas
  app.on('session-created', async (newSession) => {
    newSession.setUserAgent(cleanUA);
    attachSessionInterception(newSession);
    attachDownloadHandler(newSession);

    const list = loadInstalledExtensionsList();
    for (const ext of list) {
      if (ext.enabled && ext.path && fs.existsSync(ext.path)) {
        try {
          await newSession.loadExtension(ext.path, { allowFileAccess: true });
        } catch {}
      }
    }
  });

  createBrowserWindow();

  app.on('activate', () => {
    if (openWindows.size === 0) createBrowserWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
