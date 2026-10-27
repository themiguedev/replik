// Gestor Completo de Pestañas, Rendimiento, Marcadores y Navegación
const tabBar = document.getElementById('tab-bar');
const newTabBtn = document.getElementById('new-tab-btn');
const browserContent = document.getElementById('browser-content');
const urlInput = document.getElementById('url-input');
const omniboxSuggestions = document.getElementById('omnibox-suggestions');
const bookmarksBar = document.getElementById('bookmarks-bar');
const bookmarksList = document.getElementById('bookmarks-list');
const btnBack = document.getElementById('btn-back');
const btnForward = document.getElementById('btn-forward');
const btnReload = document.getElementById('btn-reload');
const btnHome = document.getElementById('btn-home');
const shieldsBtn = document.getElementById('shields-btn');
const shieldsCounter = document.getElementById('shields-counter');
const shieldsPopup = document.getElementById('shields-popup');
const popupDomain = document.getElementById('popup-domain');
const popupBlockedCount = document.getElementById('popup-blocked-count');
const shieldsToggle = document.getElementById('shields-toggle');
const scriptsToggle = document.getElementById('scripts-toggle');
const btnToggleAggressive = document.getElementById('btn-toggle-aggressive');
const btnMenu = document.getElementById('btn-menu');
const mainMenu = document.getElementById('main-menu');
const lockIcon = document.getElementById('lock-icon');

// Nuevos Controles de Rendimiento y UX
const btnSpeedreader = document.getElementById('btn-speedreader');
const speedreaderOverlay = document.getElementById('speedreader-overlay');
const btnCloseSpeedreader = document.getElementById('btn-close-speedreader');
const speedreaderTitle = document.getElementById('speedreader-title');
const speedreaderMeta = document.getElementById('speedreader-meta');
const speedreaderContent = document.getElementById('speedreader-content');
const batteryIndicator = document.getElementById('battery-indicator');
const btnGlobalMedia = document.getElementById('btn-global-media');
const globalMediaPopup = document.getElementById('global-media-popup');
const mediaCardsContainer = document.getElementById('media-cards-container');
const tabHoverCard = document.getElementById('tab-hover-card');
const hoverCardTitle = document.getElementById('hover-card-title');
const hoverCardDomain = document.getElementById('hover-card-domain');
const hoverCardMem = document.getElementById('hover-card-mem');
const hoverCardStatus = document.getElementById('hover-card-status');
const customContextMenu = document.getElementById('custom-context-menu');
const tabContextMenu = document.getElementById('tab-context-menu');

// Controles de Barra de Título Nativa y Ventana
const winBtnMinimize = document.getElementById('win-btn-minimize');
const winBtnMaximize = document.getElementById('win-btn-maximize');
const winBtnClose = document.getElementById('win-btn-close');
const winIconMaximize = document.getElementById('win-icon-maximize');
const tabSearchBtn = document.getElementById('tab-search-btn');
const titlebarDragRegion = document.getElementById('titlebar-drag-region');

function updateMaximizeIcon(isMax) {
  if (winIconMaximize) {
    if (isMax) {
      winIconMaximize.innerHTML = `<path d="M2 0h8v8H8V2H2V0zm-2 2h8v8H0V2zm1 1v6h6V3H1z"/>`;
      if (winBtnMaximize) winBtnMaximize.title = 'Restaurar';
    } else {
      winIconMaximize.innerHTML = `<path d="M1 1h8v8H1V1zm1 1v6h6V2H2z"/>`;
      if (winBtnMaximize) winBtnMaximize.title = 'Maximizar';
    }
  }
}

function initWindowControls() {
  function bindWindowAction(btn, action) {
    if (!btn) return;
    let lastTime = 0;
    const trigger = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const now = Date.now();
      if (now - lastTime < 150) return;
      lastTime = now;
      action();
    };
    btn.addEventListener('click', trigger);
    btn.addEventListener('mouseup', trigger);
  }

  bindWindowAction(winBtnMinimize, () => {
    if (window.braveAPI && window.braveAPI.minimizeWindow) {
      window.braveAPI.minimizeWindow();
    }
  });

  bindWindowAction(winBtnMaximize, () => {
    if (window.braveAPI && window.braveAPI.maximizeWindow) {
      window.braveAPI.maximizeWindow().then((isMax) => {
        if (typeof isMax === 'boolean') updateMaximizeIcon(isMax);
      }).catch(() => {});
    }
  });

  bindWindowAction(winBtnClose, () => {
    if (window.braveAPI && window.braveAPI.closeWindow) {
      window.braveAPI.closeWindow();
    }
  });

  if (titlebarDragRegion) {
    titlebarDragRegion.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (window.braveAPI && window.braveAPI.maximizeWindow) {
        window.braveAPI.maximizeWindow().then((isMax) => {
          if (typeof isMax === 'boolean') updateMaximizeIcon(isMax);
        }).catch(() => {});
      }
    });
  }

  if (window.braveAPI) {
    if (window.braveAPI.onWindowStateChanged) {
      window.braveAPI.onWindowStateChanged((state) => {
        if (state && typeof state.isMaximized === 'boolean') {
          updateMaximizeIcon(state.isMaximized);
        }
      });
    }
    if (window.braveAPI.isMaximized) {
      window.braveAPI.isMaximized().then((isMax) => {
        updateMaximizeIcon(isMax);
      }).catch(() => {});
    }
  }
}

initWindowControls();

// Ícono del Escudo Brave con logo oficial
const BRAVE_SHIELD_SVG = `
  <img class="tab-shield-img" src="logo.png" width="16" height="16" alt="Brave" style="vertical-align: middle; object-fit: contain; display: block; pointer-events: none;">
`;

const RELOAD_SVG = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
  </svg>
`;

const STOP_SVG = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
`;

const LOCK_SVG_SECURE = `
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
`;

const LOCK_SVG_INSECURE = `
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fb542b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
`;

const LOCK_SVG_BRAVE = `
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
`;

// Helper de resolución de URLs internas robustas
function resolveInternalUrl(fileName) {
  try {
    return new URL(fileName, window.location.href).href;
  } catch {
    return fileName;
  }
}

// Configuración de URLs internas
const ntpUrl = window.braveAPI && window.braveAPI.getNtpUrl ? window.braveAPI.getNtpUrl() : resolveInternalUrl('ntp.html');
const settingsUrl = window.braveAPI && window.braveAPI.getSettingsUrl ? window.braveAPI.getSettingsUrl() : resolveInternalUrl('settings.html');
const historyUrl = window.braveAPI && window.braveAPI.getHistoryUrl ? window.braveAPI.getHistoryUrl() : resolveInternalUrl('history.html');
const downloadsUrl = window.braveAPI && window.braveAPI.getDownloadsUrl ? window.braveAPI.getDownloadsUrl() : resolveInternalUrl('downloads.html');
const adblockUrl = window.braveAPI && window.braveAPI.getAdblockUrl ? window.braveAPI.getAdblockUrl() : resolveInternalUrl('adblock.html');
const playlistUrl = window.braveAPI && window.braveAPI.getPlaylistUrl ? window.braveAPI.getPlaylistUrl() : resolveInternalUrl('playlist.html');
const extensionsUrl = window.braveAPI && window.braveAPI.getExtensionsUrl ? window.braveAPI.getExtensionsUrl() : resolveInternalUrl('extensions.html');
const bookmarksUrl = window.braveAPI && window.braveAPI.getBookmarksUrl ? window.braveAPI.getBookmarksUrl() : resolveInternalUrl('bookmarks.html');
const versionUrl = window.braveAPI && window.braveAPI.getVersionUrl ? window.braveAPI.getVersionUrl() : resolveInternalUrl('version.html');

// Detección de modo Tor o Privado en la ventana
if (window.braveAPI) {
  if (window.braveAPI.isTorMode && window.braveAPI.isTorMode()) {
    document.body.classList.add('tor-mode');
  } else if (window.braveAPI.isPrivateMode && window.braveAPI.isPrivateMode()) {
    document.body.classList.add('private-mode');
  }
}

let currentSearchEngine = localStorage.getItem('brave_setting_engine') || 'brave';

function getSearchEngineQueryUrl(query) {
  const engine = currentSearchEngine || localStorage.getItem('brave_setting_engine') || 'brave';
  const q = encodeURIComponent(query);
  switch (engine) {
    case 'google':
      return `https://www.google.com/search?q=${q}`;
    case 'duckduckgo':
      return `https://duckduckgo.com/?q=${q}`;
    case 'bing':
      return `https://www.bing.com/search?q=${q}`;
    case 'qwant':
      return `https://www.qwant.com/?q=${q}`;
    case 'brave':
    default:
      return `https://search.brave.com/search?q=${q}`;
  }
}

function getSearchEngineName() {
  const engine = currentSearchEngine || localStorage.getItem('brave_setting_engine') || 'brave';
  switch (engine) {
    case 'google': return 'Google';
    case 'duckduckgo': return 'DuckDuckGo';
    case 'bing': return 'Bing';
    case 'qwant': return 'Qwant';
    case 'brave':
    default:
      return 'Brave Search';
  }
}

let tabs = [];
let activeTabId = null;
let tabCounter = 0;
let draggedTabId = null;
let hoverTimer = null;
let contextMenuTargetData = null;
let contextMenuTargetTabId = null;

// Pila de pestañas cerradas para Ctrl+Shift+T
const closedTabsStack = [];

// Grupos de pestañas predefinidos
const TAB_GROUPS = {
  'group-orange': { id: 'group-orange', name: 'Trabajo', color: 'orange', collapsed: false },
  'group-purple': { id: 'group-purple', name: 'Investigación', color: 'purple', collapsed: false },
  'group-blue': { id: 'group-blue', name: 'Multimedia', color: 'blue', collapsed: false },
};

// ==========================================
// 1. MEDIDOR DE BATERÍA Y MODO AHORRO INTELIGENTE (Smart Energy Saver)
// ==========================================
let isEnergySaverActive = false;
let autoBatterySaverEnabled = localStorage.getItem('brave_battery_auto_saver') !== 'false';

const batteryPopup = document.getElementById('battery-popup');
const batteryPopupLevel = document.getElementById('battery-popup-level');
const batteryPopupStatus = document.getElementById('battery-popup-status');
const batterySaverToggle = document.getElementById('battery-saver-toggle');
const batteryAutoToggle = document.getElementById('battery-auto-toggle');

function initBatteryMonitoring() {
  if (batteryAutoToggle) {
    batteryAutoToggle.checked = autoBatterySaverEnabled;
    batteryAutoToggle.addEventListener('change', () => {
      autoBatterySaverEnabled = batteryAutoToggle.checked;
      localStorage.setItem('brave_battery_auto_saver', String(autoBatterySaverEnabled));
    });
  }

  if (batterySaverToggle) {
    batterySaverToggle.addEventListener('change', () => {
      activateEnergySaver(batterySaverToggle.checked, false);
    });
  }

  if ('getBattery' in navigator) {
    navigator.getBattery().then((battery) => {
      function updateBatteryUI() {
        const level = Math.round(battery.level * 100);
        const icon = battery.charging ? '⚡' : '🔋';
        if (batteryIndicator) batteryIndicator.textContent = `${icon} ${level}%`;
        if (batteryPopupLevel) batteryPopupLevel.textContent = `${level}%`;
        if (batteryPopupStatus) {
          batteryPopupStatus.textContent = battery.charging
            ? 'Conectado a la corriente (cargando)'
            : 'En batería';
        }

        if (level <= 20 && !battery.charging) {
          if (batteryIndicator) batteryIndicator.classList.add('low');
          if (batteryPopup) batteryPopup.classList.add('low');
          if (autoBatterySaverEnabled && !isEnergySaverActive) {
            activateEnergySaver(true, true);
          }
        } else {
          if (batteryIndicator) batteryIndicator.classList.remove('low');
          if (batteryPopup) batteryPopup.classList.remove('low');
        }
      }
      updateBatteryUI();
      battery.addEventListener('levelchange', updateBatteryUI);
      battery.addEventListener('chargingchange', updateBatteryUI);
    }).catch(() => {
      if (batteryIndicator) batteryIndicator.textContent = '🔋 100%';
    });
  }
}

function activateEnergySaver(enable, wasAuto = false) {
  isEnergySaverActive = enable;
  if (batterySaverToggle) batterySaverToggle.checked = enable;

  if (isEnergySaverActive) {
    document.body.classList.add('energy-saver-active');
    if (batteryIndicator) {
      batteryIndicator.title = 'Modo Ahorro de Energía (Activo) - Suspende pestañas inactivas para extender la batería';
      batteryIndicator.style.borderColor = 'var(--brave-orange)';
    }
    // Optimizar y suspender pestañas en segundo plano
    tabs.forEach((t) => {
      if (t.id !== activeTabId && t.webviewEl) {
        t.webviewEl.executeJavaScript(`
          if (!window.__braveSaverActive) {
            window.__braveSaverActive = true;
          }
        `).catch(() => {});
      }
    });

    if (wasAuto) {
      showGlobalToast('🔋 Modo Ahorro activado automáticamente (<20% batería). Pestañas optimizadas.');
    }
  } else {
    document.body.classList.remove('energy-saver-active');
    if (batteryIndicator) {
      batteryIndicator.title = 'Estado de batería y modo ahorro';
      batteryIndicator.style.borderColor = '';
    }
  }
}

if (batteryIndicator) {
  batteryIndicator.addEventListener('click', (e) => {
    e.stopPropagation();
    if (batteryPopup) batteryPopup.classList.toggle('open');
  });
}

initBatteryMonitoring();

// ==========================================
// 2. SISTEMA DE MARCADORES (Ctrl + Shift + B)
// ==========================================
const DEFAULT_BOOKMARKS = [
  { title: 'Brave Search', url: 'https://search.brave.com', icon: '🦁' },
  { title: 'YouTube', url: 'https://www.youtube.com', icon: '▶️' },
  { title: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { title: 'Wikipedia', url: 'https://www.wikipedia.org', icon: '📖' },
  { title: 'Reddit', url: 'https://www.reddit.com', icon: '🤖' },
  { title: 'Brave Sync', url: 'brave://sync', icon: '🔄' },
];

function getStoredBookmarks() {
  try {
    const raw = localStorage.getItem('brave_bookmarks');
    if (!raw) {
      localStorage.setItem('brave_bookmarks', JSON.stringify(DEFAULT_BOOKMARKS));
      return DEFAULT_BOOKMARKS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_BOOKMARKS;
  }
}

function saveBookmarks(list) {
  localStorage.setItem('brave_bookmarks', JSON.stringify(list));
  renderBookmarks();
}

// Precarga y Pre-renderizado Especulativo (Speculative Prerendering / DNS & TLS Warmup)
function speculativeWarmup(targetUrl) {
  if (!targetUrl || !targetUrl.startsWith('http')) return;
  try {
    const origin = new URL(targetUrl).origin;
    if (document.querySelector(`link[data-warmup="${origin}"]`)) return;

    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = origin;
    dnsPrefetch.setAttribute('data-warmup', origin);
    document.head.appendChild(dnsPrefetch);

    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = origin;
    preconnect.crossOrigin = 'anonymous';
    preconnect.setAttribute('data-warmup', origin);
    document.head.appendChild(preconnect);
  } catch {}
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let activeBarBookmarkIndex = -1;
let draggedBarBookmarkIndex = -1;

function renderBookmarks() {
  if (!bookmarksList) return;
  bookmarksList.innerHTML = '';
  const list = getStoredBookmarks();

  // Filtrar marcadores que pertenecen a la barra (o sin carpeta asignada)
  const barBookmarks = list.filter((b) => !b.folder || b.folder === 'bar');

  barBookmarks.forEach((b) => {
    const realIdx = list.indexOf(b);
    const chip = document.createElement('div');
    chip.className = 'bookmark-chip';
    chip.draggable = true;
    chip.setAttribute('data-idx', realIdx);
    chip.title = `${b.title} (${b.url})\nClic: abrir • Rueda: nueva pestaña • Clic derecho: editar y opciones`;

    // Si tiene favicon real o ícono predeterminado
    let iconHtml = `<span class="bookmark-chip-icon">${b.icon || '🌐'}</span>`;
    if (b.url && b.url.startsWith('http')) {
      try {
        const u = new URL(b.url);
        iconHtml = `<img class="bookmark-chip-icon" src="https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32" width="14" height="14" style="object-fit:contain;border-radius:2px;" onerror="this.outerHTML='<span class=\\'bookmark-chip-icon\\'>🌐</span>'">`;
      } catch {}
    }

    chip.innerHTML = `
      ${iconHtml}
      <span class="bookmark-chip-title">${escapeHtml(b.title)}</span>
    `;

    // Precarga especulativa al pasar el cursor (hover > 120ms)
    let warmupTimer = null;
    chip.addEventListener('mouseenter', () => {
      warmupTimer = setTimeout(() => {
        speculativeWarmup(b.url);
      }, 120);
    });
    chip.addEventListener('mouseleave', () => {
      if (warmupTimer) clearTimeout(warmupTimer);
    });

    chip.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(b.url);
    });

    chip.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        createTab(b.url);
      }
    });

    // Menú contextual nativo editable al clic derecho
    chip.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openBarContextMenu(realIdx, e.clientX, e.clientY);
    });

    // Drag & Drop para reordenar en la barra de marcadores
    chip.addEventListener('dragstart', (e) => {
      draggedBarBookmarkIndex = realIdx;
      chip.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', realIdx);
    });

    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
      document.querySelectorAll('.bookmark-chip').forEach((c) => {
        c.classList.remove('drag-over-left', 'drag-over-right');
      });
    });

    chip.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedBarBookmarkIndex === realIdx) return;
      const rect = chip.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      chip.classList.remove('drag-over-left', 'drag-over-right');
      if (e.clientX < midX) chip.classList.add('drag-over-left');
      else chip.classList.add('drag-over-right');
    });

    chip.addEventListener('dragleave', () => {
      chip.classList.remove('drag-over-left', 'drag-over-right');
    });

    chip.addEventListener('drop', (e) => {
      e.preventDefault();
      chip.classList.remove('drag-over-left', 'drag-over-right');
      if (draggedBarBookmarkIndex < 0 || draggedBarBookmarkIndex === realIdx) return;

      const rect = chip.getBoundingClientRect();
      const insertBefore = e.clientX < (rect.left + rect.width / 2);

      const itemToMove = list.splice(draggedBarBookmarkIndex, 1)[0];
      let targetIdx = list.indexOf(b);
      if (!insertBefore) targetIdx++;

      list.splice(targetIdx, 0, itemToMove);
      saveBookmarks(list);
      showGlobalToast('✓ Barra de marcadores reordenada');
    });

    bookmarksList.appendChild(chip);
  });

  updateBookmarkStarState();
}

// Alias de sincronización para llamadas desde webviews
const renderBookmarksBar = renderBookmarks;

// Menú contextual de la barra de marcadores
const bmBarCtxMenu = document.getElementById('bm-bar-context-menu');
const bmBarEditModal = document.getElementById('bm-bar-edit-modal');
const bmBarEditName = document.getElementById('bm-bar-edit-name');
const bmBarEditUrl = document.getElementById('bm-bar-edit-url');

function closeBarContextMenu() {
  if (bmBarCtxMenu) bmBarCtxMenu.classList.remove('open');
}

document.addEventListener('click', closeBarContextMenu);

function openBarContextMenu(idx, x, y) {
  if (!bmBarCtxMenu) return;
  activeBarBookmarkIndex = idx;
  bmBarCtxMenu.style.display = 'block';
  const rect = bmBarCtxMenu.getBoundingClientRect();
  let left = x;
  let top = y;
  if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 8;
  if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 8;
  bmBarCtxMenu.style.left = `${Math.max(8, left)}px`;
  bmBarCtxMenu.style.top = `${Math.max(8, top)}px`;
  bmBarCtxMenu.classList.add('open');
}

// Clic derecho en espacio vacío de la barra de marcadores
if (bookmarksBar) {
  bookmarksBar.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.bookmark-chip')) return;
    e.preventDefault();
    openBarContextMenu(-1, e.clientX, e.clientY);
  });
}

// Acciones del menú contextual de la barra
const ctxOpenNewTab = document.getElementById('bm-ctx-open-newtab');
if (ctxOpenNewTab) {
  ctxOpenNewTab.addEventListener('click', () => {
    const list = getStoredBookmarks();
    if (activeBarBookmarkIndex >= 0 && list[activeBarBookmarkIndex]) {
      createTab(list[activeBarBookmarkIndex].url);
    }
  });
}

const ctxOpenWindow = document.getElementById('bm-ctx-open-window');
if (ctxOpenWindow) {
  ctxOpenWindow.addEventListener('click', () => {
    const list = getStoredBookmarks();
    if (activeBarBookmarkIndex >= 0 && list[activeBarBookmarkIndex]) {
      const u = list[activeBarBookmarkIndex].url;
      if (window.braveAPI && window.braveAPI.openWindow) {
        window.braveAPI.openWindow(u);
      } else {
        createTab(u);
      }
    }
  });
}

const ctxOpenPrivate = document.getElementById('bm-ctx-open-private');
if (ctxOpenPrivate) {
  ctxOpenPrivate.addEventListener('click', () => {
    const list = getStoredBookmarks();
    if (activeBarBookmarkIndex >= 0 && list[activeBarBookmarkIndex]) {
      const u = list[activeBarBookmarkIndex].url;
      if (window.braveAPI && window.braveAPI.openPrivateWindow) {
        window.braveAPI.openPrivateWindow(u);
      }
    }
  });
}

const ctxEdit = document.getElementById('bm-ctx-edit');
if (ctxEdit) {
  ctxEdit.addEventListener('click', () => {
    const list = getStoredBookmarks();
    if (activeBarBookmarkIndex >= 0 && list[activeBarBookmarkIndex] && bmBarEditModal) {
      const b = list[activeBarBookmarkIndex];
      bmBarEditName.value = b.title || '';
      bmBarEditUrl.value = b.url || '';
      bmBarEditModal.classList.add('open');
      bmBarEditName.focus();
    }
  });
}

const btnCancelBarEdit = document.getElementById('btn-cancel-bar-edit');
if (btnCancelBarEdit) {
  btnCancelBarEdit.addEventListener('click', () => {
    if (bmBarEditModal) bmBarEditModal.classList.remove('open');
  });
}

const btnSaveBarEdit = document.getElementById('btn-save-bar-edit');
if (btnSaveBarEdit) {
  btnSaveBarEdit.addEventListener('click', () => {
    const list = getStoredBookmarks();
    if (activeBarBookmarkIndex >= 0 && list[activeBarBookmarkIndex]) {
      const newTitle = bmBarEditName.value.trim() || 'Marcador';
      let newUrl = bmBarEditUrl.value.trim();
      if (!newUrl) return;
      if (!/^https?:\/\//i.test(newUrl) && !newUrl.startsWith('brave://')) newUrl = 'https://' + newUrl;
      list[activeBarBookmarkIndex].title = newTitle;
      list[activeBarBookmarkIndex].url = newUrl;
      saveBookmarks(list);
      showGlobalToast('✓ Marcador editado correctamente');
    }
    if (bmBarEditModal) bmBarEditModal.classList.remove('open');
  });
}

const ctxDelete = document.getElementById('bm-ctx-delete');
if (ctxDelete) {
  ctxDelete.addEventListener('click', () => {
    const list = getStoredBookmarks();
    if (activeBarBookmarkIndex >= 0 && list[activeBarBookmarkIndex]) {
      const title = list[activeBarBookmarkIndex].title;
      list.splice(activeBarBookmarkIndex, 1);
      saveBookmarks(list);
      showGlobalToast(`✓ Marcador "${title}" eliminado`);
    }
  });
}

const ctxAddPage = document.getElementById('bm-ctx-add-page');
if (ctxAddPage) {
  ctxAddPage.addEventListener('click', () => {
    addCurrentPageToBookmarks();
  });
}

const ctxManager = document.getElementById('bm-ctx-manager');
if (ctxManager) {
  ctxManager.addEventListener('click', () => {
    navigateTo(bookmarksUrl);
  });
}

function toggleBookmarksBar(force) {
  if (!bookmarksBar) return;
  const shouldHide = typeof force === 'boolean' ? !force : !bookmarksBar.classList.contains('hidden');
  if (shouldHide) {
    bookmarksBar.classList.add('hidden');
    localStorage.setItem('brave_bookmarks_bar_visible', 'false');
  } else {
    bookmarksBar.classList.remove('hidden');
    localStorage.setItem('brave_bookmarks_bar_visible', 'true');
  }
}

// ==========================================
// ESTRELLA DE MARCADORES (OMNIBOX STAR & POPOVER)
// ==========================================
const btnStar = document.getElementById('btn-star');
const bmPopup = document.getElementById('bookmark-edit-popup');
const bmPopupHeading = document.getElementById('bm-popup-heading');
const bmPopupName = document.getElementById('bm-popup-name');
const bmPopupFolder = document.getElementById('bm-popup-folder');
const btnCloseBmPopup = document.getElementById('btn-close-bm-popup');
const btnBmPopupRemove = document.getElementById('btn-bm-popup-remove');
const btnBmPopupDone = document.getElementById('btn-bm-popup-done');

function updateBookmarkStarState() {
  if (!btnStar) return;
  const tab = getActiveTab();
  if (!tab || !tab.url || tab.url.includes('ntp.html')) {
    btnStar.classList.remove('active');
    btnStar.disabled = true;
    return;
  }
  btnStar.disabled = false;
  const list = getStoredBookmarks();
  const isBookmarked = list.some((b) => b.url === tab.url);
  btnStar.classList.toggle('active', isBookmarked);
}

function openBookmarkPopup(isNew) {
  if (!bmPopup) return;
  const tab = getActiveTab();
  if (!tab || !tab.url || tab.url.includes('ntp.html')) return;

  const list = getStoredBookmarks();
  const existing = list.find((b) => b.url === tab.url);

  // Poblar carpetas disponibles
  let customFolders = [];
  try {
    customFolders = JSON.parse(localStorage.getItem('brave_bookmark_folders') || '["Favoritos", "Trabajo"]');
  } catch {
    customFolders = ['Favoritos', 'Trabajo'];
  }

  bmPopupFolder.innerHTML = `
    <option value="bar">Barra de marcadores</option>
    <option value="other">Otros marcadores</option>
    ${customFolders.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('')}
  `;

  if (existing) {
    bmPopupHeading.textContent = 'Editar marcador';
    bmPopupName.value = existing.title || tab.title || '';
    bmPopupFolder.value = existing.folder || 'bar';
  } else {
    bmPopupHeading.textContent = 'Marcador añadido';
    bmPopupName.value = tab.title || 'Nueva página';
    bmPopupFolder.value = 'bar';
  }

  bmPopup.classList.add('open');
  bmPopupName.focus();
  bmPopupName.select();
}

function closeBookmarkPopup() {
  if (bmPopup) bmPopup.classList.remove('open');
}

if (btnStar) {
  btnStar.addEventListener('click', (e) => {
    e.stopPropagation();
    const tab = getActiveTab();
    if (!tab || !tab.url || tab.url.includes('ntp.html')) return;

    const list = getStoredBookmarks();
    const existing = list.find((b) => b.url === tab.url);

    if (!existing) {
      // Guardar de inmediato y abrir editor
      const newBm = {
        title: tab.title || 'Nueva página',
        url: tab.url,
        folder: 'bar',
      };
      list.push(newBm);
      saveBookmarks(list);
      showGlobalToast(`★ Guardado en marcadores: ${newBm.title}`);
      openBookmarkPopup(true);
    } else {
      openBookmarkPopup(false);
    }
  });
}

if (btnCloseBmPopup) {
  btnCloseBmPopup.addEventListener('click', closeBookmarkPopup);
}

if (btnBmPopupRemove) {
  btnBmPopupRemove.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.url) {
      let list = getStoredBookmarks();
      list = list.filter((b) => b.url !== tab.url);
      saveBookmarks(list);
      showGlobalToast('✓ Marcador eliminado');
    }
    closeBookmarkPopup();
  });
}

if (btnBmPopupDone) {
  btnBmPopupDone.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.url) {
      const list = getStoredBookmarks();
      const existing = list.find((b) => b.url === tab.url);
      const newTitle = bmPopupName.value.trim() || tab.title || 'Marcador';
      const newFolder = bmPopupFolder.value || 'bar';

      if (existing) {
        existing.title = newTitle;
        existing.folder = newFolder;
      } else {
        list.push({ title: newTitle, url: tab.url, folder: newFolder });
      }
      saveBookmarks(list);
      showGlobalToast(`✓ Marcador actualizado en "${newFolder === 'bar' ? 'Barra de marcadores' : newFolder}"`);
    }
    closeBookmarkPopup();
  });
}

// Cerrar popup al pulsar fuera
document.addEventListener('click', (e) => {
  if (bmPopup && bmPopup.classList.contains('open') && !e.target.closest('#bookmark-edit-popup') && !e.target.closest('#btn-star')) {
    closeBookmarkPopup();
  }
});

function addCurrentPageToBookmarks() {
  const tab = getActiveTab();
  if (!tab) return;
  const title = tab.title || 'Nueva página';
  const url = tab.url;
  if (!url || url.includes('ntp.html')) {
    showGlobalToast('Esta página no se puede añadir a marcadores.');
    return;
  }
  const list = getStoredBookmarks();
  const exists = list.some((b) => b.url === url);
  if (exists) {
    openBookmarkPopup(false);
    return;
  }

  list.push({ title, url, folder: 'bar' });
  saveBookmarks(list);
  showGlobalToast(`★ Marcador guardado en la barra: ${title}`);
  openBookmarkPopup(true);
}

if (localStorage.getItem('brave_bookmarks_bar_visible') === 'false') {
  if (bookmarksBar) bookmarksBar.classList.add('hidden');
}
renderBookmarks();

// ==========================================
// 3. AUTOCOMPLETADO Y SUGERENCIAS EN OMNIBOX
// ==========================================
let currentSuggestions = [];
let selectedSuggestionIndex = -1;

const INTERNAL_PAGES = [
  { title: 'Configuración de Brave', url: 'brave://settings', icon: '🛡️', badge: 'Brave' },
  { title: 'Gestor de Marcadores', url: 'brave://bookmarks', icon: '🔖', badge: 'Brave' },
  { title: 'Historial de navegación', url: 'brave://history', icon: '🕒', badge: 'Brave' },
  { title: 'Descargas', url: 'brave://downloads', icon: '📥', badge: 'Brave' },
  { title: 'Brave Sync (25 palabras)', url: 'brave://sync', icon: '🔄', badge: 'Brave' },
  { title: 'Filtros y Reglas Adblock', url: 'brave://adblock', icon: '🛡️', badge: 'Brave' },
  { title: 'Brave Playlist', url: 'brave://playlist', icon: '📑', badge: 'Brave' },
  { title: 'Extensiones de Brave', url: 'brave://extensions', icon: '🧩', badge: 'Brave' },
  { title: 'Versión del Sistema y Diagnóstico', url: 'brave://version', icon: '🦁', badge: 'Brave' },
  { title: 'Nueva Pestaña', url: 'brave://newtab', icon: '🦁', badge: 'Brave' },
];

function closeSuggestions() {
  if (!omniboxSuggestions) return;
  omniboxSuggestions.classList.remove('open');
  omniboxSuggestions.innerHTML = '';
  currentSuggestions = [];
  selectedSuggestionIndex = -1;
}

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    text.substring(0, idx) +
    `<b>${text.substring(idx, idx + query.length)}</b>` +
    text.substring(idx + query.length)
  );
}

function updateOmniboxSuggestions(query) {
  if (!omniboxSuggestions) return;
  const q = query.trim().toLowerCase();
  if (!q) {
    closeSuggestions();
    return;
  }

  const results = [];

  // Soporte de prefijos de búsqueda rápida (Custom Search Bangs)
  if (q.startsWith(':yt ') || q.startsWith(':w ') || q.startsWith(':g ') || q.startsWith(':gh ') || q.startsWith(':d ')) {
    let service = 'Brave Search';
    let icon = '🔍';
    let term = q.substring(3).trim();
    if (q.startsWith(':gh ')) term = q.substring(4).trim();

    if (q.startsWith(':yt ')) { service = 'YouTube'; icon = '▶️'; }
    else if (q.startsWith(':w ')) { service = 'Wikipedia'; icon = '📖'; }
    else if (q.startsWith(':g ')) { service = 'Google'; icon = '🌐'; }
    else if (q.startsWith(':gh ')) { service = 'GitHub'; icon = '🐙'; }
    else if (q.startsWith(':d ')) { service = 'DuckDuckGo'; icon = '🦆'; }

    results.push({
      type: 'bang',
      title: `Buscar "${term}" en ${service}`,
      url: `Búsqueda directa rápida en ${service}`,
      icon,
      badge: service,
      actionUrl: q,
    });
    currentSuggestions = results;
    renderSuggestionsList(query);
    return;
  }

  // 1. Coincidencias con Páginas Internas de Brave
  INTERNAL_PAGES.forEach((item) => {
    if (item.url.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)) {
      results.push({
        type: 'internal',
        title: item.title,
        url: item.url,
        icon: item.icon,
        badge: item.badge,
        actionUrl: item.url,
      });
    }
  });

  // 2. Coincidencias con Marcadores
  const bookmarks = getStoredBookmarks();
  bookmarks.forEach((b) => {
    if (b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)) {
      results.push({
        type: 'bookmark',
        title: b.title,
        url: b.url,
        icon: b.icon || '★',
        badge: 'Marcador',
        actionUrl: b.url,
      });
    }
  });

  // 3. Coincidencias con Historial Local
  try {
    const history = JSON.parse(localStorage.getItem('brave_browser_history') || '[]');
    let count = 0;
    for (const h of history) {
      if (count >= 3) break;
      if (h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q)) {
        if (!results.some((r) => r.actionUrl === h.url)) {
          results.push({
            type: 'history',
            title: h.title,
            url: h.url,
            icon: '🕒',
            badge: 'Historial',
            actionUrl: h.url,
          });
          count++;
        }
      }
    }
  } catch {}

  // 4. Sugerencia Principal según Motor Configurado o Atajos !bangs
  if (q.startsWith(':g ') || q.startsWith('!g ')) {
    const text = query.replace(/^[:!]g\s+/i, '');
    results.unshift({
      type: 'search',
      title: `Buscar en Google: "${text}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(text)}`,
      icon: '🔍',
      badge: '!g (Google)',
      actionUrl: `https://www.google.com/search?q=${encodeURIComponent(text)}`,
      searchTerm: text,
    });
  } else if (q.startsWith(':yt ') || q.startsWith('!yt ')) {
    const text = query.replace(/^[:!]yt\s+/i, '');
    results.unshift({
      type: 'search',
      title: `Buscar en YouTube: "${text}"`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(text)}`,
      icon: '▶️',
      badge: '!yt (YouTube)',
      actionUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(text)}`,
      searchTerm: text,
    });
  } else if (q.startsWith(':w ') || q.startsWith('!w ')) {
    const text = query.replace(/^[:!]w\s+/i, '');
    results.unshift({
      type: 'search',
      title: `Buscar en Wikipedia: "${text}"`,
      url: `https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(text)}`,
      icon: '📖',
      badge: '!w (Wikipedia)',
      actionUrl: `https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(text)}`,
      searchTerm: text,
    });
  } else if (q.startsWith(':gh ') || q.startsWith('!gh ')) {
    const text = query.replace(/^[:!]gh\s+/i, '');
    results.unshift({
      type: 'search',
      title: `Buscar en GitHub: "${text}"`,
      url: `https://github.com/search?q=${encodeURIComponent(text)}`,
      icon: '🐙',
      badge: '!gh (GitHub)',
      actionUrl: `https://github.com/search?q=${encodeURIComponent(text)}`,
      searchTerm: text,
    });
  } else if (q.startsWith(':ddg ') || q.startsWith('!ddg ') || q.startsWith(':d ') || q.startsWith('!d ')) {
    const text = query.replace(/^[:!](ddg|d)\s+/i, '');
    results.unshift({
      type: 'search',
      title: `Buscar en DuckDuckGo: "${text}"`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(text)}`,
      icon: '🦆',
      badge: '!ddg (DuckDuckGo)',
      actionUrl: `https://duckduckgo.com/?q=${encodeURIComponent(text)}`,
      searchTerm: text,
    });
  } else if (q.startsWith(':b ') || q.startsWith('!b ')) {
    const text = query.replace(/^[:!]b\s+/i, '');
    results.unshift({
      type: 'search',
      title: `Buscar en Brave Search: "${text}"`,
      url: `https://search.brave.com/search?q=${encodeURIComponent(text)}`,
      icon: '🦁',
      badge: '!b (Brave)',
      actionUrl: `https://search.brave.com/search?q=${encodeURIComponent(text)}`,
      searchTerm: text,
    });
  } else {
    const curEngineName = getSearchEngineName();
    const curEngineUrl = getSearchEngineQueryUrl(query);
    results.unshift({
      type: 'search',
      title: `Buscar "${query}" en ${curEngineName}`,
      url: curEngineUrl,
      icon: '🔍',
      badge: curEngineName,
      actionUrl: curEngineUrl,
      searchTerm: query,
    });
  }

  // 5. Sugerencias Complementarias
  if (!q.includes('.') && !q.startsWith('brave://') && !q.startsWith('http')) {
    results.push({
      type: 'search',
      title: `${query} en Wikipedia`,
      url: `https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
      icon: '📖',
      badge: 'Wikipedia',
      actionUrl: `https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
      searchTerm: `${query} wikipedia`,
    });
    results.push({
      type: 'search',
      title: `${query} en YouTube`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      icon: '▶️',
      badge: 'YouTube',
      actionUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      searchTerm: `${query} youtube`,
    });
  }

  currentSuggestions = results.slice(0, 7);
  selectedSuggestionIndex = -1;

  if (currentSuggestions.length === 0) {
    closeSuggestions();
    return;
  }

  renderSuggestionsList(query);
}

function renderSuggestionsList(query) {
  omniboxSuggestions.innerHTML = '';
  currentSuggestions.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'suggestion-item';
    if (index === selectedSuggestionIndex) el.classList.add('selected');
    el.setAttribute('data-index', String(index));
    el.innerHTML = `
      <span class="suggestion-icon">${item.icon}</span>
      <div class="suggestion-text">
        <span class="suggestion-title">${highlightMatch(item.title, query)}</span>
        <span class="suggestion-url">${item.url}</span>
      </div>
      <span class="suggestion-badge">${item.badge}</span>
    `;

    el.addEventListener('mouseenter', () => {
      if (item.actionUrl) speculativeWarmup(item.actionUrl);
    });

    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      navigateTo(item.actionUrl);
      closeSuggestions();
    });

    omniboxSuggestions.appendChild(el);
  });

  omniboxSuggestions.classList.add('open');
}

function selectSuggestion(index, updateInput = true) {
  if (currentSuggestions.length === 0) return;
  selectedSuggestionIndex = index;

  const items = omniboxSuggestions.querySelectorAll('.suggestion-item');
  items.forEach((it, idx) => {
    if (idx === selectedSuggestionIndex) {
      it.classList.add('selected');
      it.scrollIntoView({ block: 'nearest' });
      if (updateInput) {
        const item = currentSuggestions[idx];
        if (item.type === 'internal' || item.type === 'bookmark' || item.type === 'history') {
          urlInput.value = item.url;
        } else if (item.searchTerm) {
          urlInput.value = item.searchTerm;
        } else {
          urlInput.value = item.title.replace(/^Buscar (?:en [^:]+:\s*)?"|"[^"]*$/g, '').trim() || item.url;
        }
      }
    } else {
      it.classList.remove('selected');
    }
  });
}

urlInput.addEventListener('input', () => {
  updateOmniboxSuggestions(urlInput.value);
});

urlInput.addEventListener('focus', () => {
  urlInput.select();
  if (urlInput.value.trim()) {
    updateOmniboxSuggestions(urlInput.value);
  }
});

urlInput.addEventListener('click', () => {
  if (document.activeElement === urlInput) {
    urlInput.select();
  }
});

urlInput.addEventListener('blur', () => {
  setTimeout(closeSuggestions, 160);
});

// ==========================================
// 4. GESTIÓN MULTI-PESTAÑA Y RENDIMIENTO
// ==========================================
function extractDomain(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') {
      if (url.includes('settings.html')) return 'Configuración';
      if (url.includes('history.html')) return 'Historial';
      if (url.includes('downloads.html')) return 'Descargas';
      if (url.includes('bookmarks.html')) return 'Marcadores';
      if (url.includes('version.html')) return 'Acerca de Brave';
      if (url.includes('adblock.html')) return 'Adblock';
      if (url.includes('playlist.html')) return 'Playlist';
      if (url.includes('extensions.html')) return 'Extensiones';
      return 'Nueva Pestaña';
    }
    return u.hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isCurrentWindowPrivate() {
  if (document.body.classList.contains('private-mode') || document.body.classList.contains('tor-mode')) return true;
  if (window.braveAPI && ((window.braveAPI.isPrivateMode && window.braveAPI.isPrivateMode()) || (window.braveAPI.isTorMode && window.braveAPI.isTorMode()))) return true;
  return false;
}

function recordHistory(url, title) {
  if (!url || url.startsWith('file:') || url.startsWith('about:')) return;
  // Nunca registrar historial en modo Privado o Tor
  if (isCurrentWindowPrivate()) return;
  try {
    const list = JSON.parse(localStorage.getItem('brave_browser_history') || '[]');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (list.length > 0 && list[0].url === url) return;
    const historyId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    list.unshift({
      id: historyId,
      title: title || url,
      url,
      time: timeStr,
      date: now.toISOString(),
      domain: extractDomain(url),
    });
    if (list.length > 500) list.pop();
    localStorage.setItem('brave_browser_history', JSON.stringify(list));
  } catch {}
}

function updateHistoryTitle(url, title) {
  if (!url || !title || title === 'Nueva pestaña' || isCurrentWindowPrivate()) return;
  try {
    const list = JSON.parse(localStorage.getItem('brave_browser_history') || '[]');
    const item = list.find((h) => h.url === url);
    if (item && item.title !== title) {
      item.title = title;
      localStorage.setItem('brave_browser_history', JSON.stringify(list));
    }
  } catch {}
}

function createTab(initialUrl = ntpUrl, options = {}) {
  tabCounter++;
  const id = `tab-${tabCounter}`;

  // Elemento Pestaña en la barra
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.id = `tab-el-${id}`;
  tabEl.draggable = true;
  tabEl.innerHTML = `
    <span class="tab-icon">${BRAVE_SHIELD_SVG}</span>
    <span class="tab-title">Nueva pestaña</span>
    <span class="tab-audio-icon" title="Silenciar pestaña">🔊</span>
    <span class="tab-close" title="Cerrar pestaña (Ctrl+W)">✕</span>
  `;

  // Elemento Webview independiente con partición adecuada (persistente en modo normal, efímera en Privado/Tor/Invitado)
  const sessionPartition = (window.braveAPI && window.braveAPI.getSessionPartition)
    ? window.braveAPI.getSessionPartition()
    : 'persist:brave_default';

  const webviewEl = document.createElement('webview');
  webviewEl.className = 'webview-instance';
  webviewEl.id = `webview-${id}`;
  webviewEl.setAttribute('allowpopups', '');
  webviewEl.setAttribute('partition', sessionPartition);
  webviewEl.src = initialUrl;

  const tabData = {
    id,
    tabEl,
    webviewEl,
    url: initialUrl,
    savedUrl: initialUrl,
    domain: extractDomain(initialUrl),
    title: 'Nueva pestaña',
    blockedCount: 0,
    darkCssKey: null,
    isAudible: false,
    isMuted: false,
    isPinned: options.pinned || false,
    isSleeping: false,
    groupId: options.groupId || null,
    estimatedMemoryMB: Math.floor(28 + Math.random() * 26),
    lastActiveTime: Date.now(),
    thumbnailUrl: null,
    bfCache: new Map(),
  };

  tabs.push(tabData);
  tabBar.appendChild(tabEl);
  browserContent.appendChild(webviewEl);

  if (tabData.isPinned) {
    applyTabPinnedState(tabData, true);
  }

  // --- Hover Card (Tarjeta Flotante de Uso de RAM) ---
  tabEl.addEventListener('mouseenter', () => {
    hoverTimer = setTimeout(() => {
      showTabHoverCard(tabData, tabEl);
    }, 320);
  });

  tabEl.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    hideTabHoverCard();
  });

  // --- Drag and Drop para Reordenamiento de Pestañas ---
  tabEl.addEventListener('dragstart', (e) => {
    draggedTabId = id;
    tabEl.classList.add('dragging');
    e.dataTransfer.setData('text/plain', id);
  });

  tabEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (draggedTabId === id) return;
    const rect = tabEl.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    tabEl.classList.remove('drag-over-left', 'drag-over-right');
    if (e.clientX < midX) {
      tabEl.classList.add('drag-over-left');
    } else {
      tabEl.classList.add('drag-over-right');
    }
  });

  tabEl.addEventListener('dragleave', () => {
    tabEl.classList.remove('drag-over-left', 'drag-over-right');
  });

  tabEl.addEventListener('drop', (e) => {
    e.preventDefault();
    tabEl.classList.remove('drag-over-left', 'drag-over-right');
    if (!draggedTabId || draggedTabId === id) return;

    const fromIdx = tabs.findIndex((t) => t.id === draggedTabId);
    const toIdx = tabs.findIndex((t) => t.id === id);
    if (fromIdx === -1 || toIdx === -1) return;

    const [movedTab] = tabs.splice(fromIdx, 1);
    tabs.splice(toIdx, 0, movedTab);
    reorderTabBarElements();
  });

  tabEl.addEventListener('dragend', () => {
    tabEl.classList.remove('dragging', 'drag-over-left', 'drag-over-right');
    draggedTabId = null;
  });

  // --- Clic Derecho Contextual en Pestaña ---
  tabEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openTabContextMenu(e.clientX, e.clientY, id);
  });

  // --- Control de Audio y Silenciado ---
  const audioBtn = tabEl.querySelector('.tab-audio-icon');

  function updateTabAudioUI() {
    if (tabData.isMuted) {
      audioBtn.style.display = 'inline-flex';
      audioBtn.textContent = '🔇';
      audioBtn.title = 'Reactivar sonido de la pestaña';
      audioBtn.classList.add('muted');
    } else if (tabData.isAudible) {
      audioBtn.style.display = 'inline-flex';
      audioBtn.textContent = '🔊';
      audioBtn.title = 'Silenciar pestaña';
      audioBtn.classList.remove('muted');
    } else {
      audioBtn.style.display = 'none';
    }
    updateGlobalMediaMenu();
  }

  audioBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    tabData.isMuted = !tabData.isMuted;
    webviewEl.setAudioMuted(tabData.isMuted);
    updateTabAudioUI();
  });

  audioBtn.addEventListener('auxclick', (e) => {
    e.stopPropagation();
  });

  // Detección nativa de eventos multimedia del Webview
  webviewEl.addEventListener('media-started-playing', () => {
    tabData.isAudible = true;
    updateTabAudioUI();
  });

  webviewEl.addEventListener('media-paused', () => {
    tabData.isAudible = false;
    updateTabAudioUI();
  });

  // Clic izquierdo para cambiar de pestaña o cerrar
  tabEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close')) {
      closeTab(id);
    } else {
      switchTab(id);
    }
  });

  // Clic con rueda del ratón (Middle-click) para cerrar inmediatamente
  tabEl.addEventListener('auxclick', (e) => {
    if (e.button === 1 && !tabData.isPinned) {
      e.preventDefault();
      e.stopPropagation();
      closeTab(id);
    }
  });

  // Eventos de estado de navegación del Webview
  webviewEl.addEventListener('did-start-loading', () => {
    if (activeTabId === id) {
      btnReload.innerHTML = STOP_SVG;
      btnReload.title = 'Detener carga (Esc)';
      hideWaybackBar();
    }
  });

  webviewEl.addEventListener('did-stop-loading', () => {
    if (activeTabId === id) {
      btnReload.innerHTML = RELOAD_SVG;
      btnReload.title = 'Recargar (Ctrl+R)';
      updateNavControls();
    }
    // Aplicación del zoom persistente por dominio
    const dom = tabData.domain || extractDomain(tabData.url);
    const zf = getStoredDomainZoom(dom);
    webviewEl.setZoomFactor(zf);
    tabData.zoomFactor = zf;
    if (activeTabId === id) {
      updateZoomUI(zf);
    }

    // Inyección de supresión de avisos de cookies (Cookie Notice Blocker)
    injectCookieBannersAutoDismiss(webviewEl);

    // Captura de miniatura visual para la tarjeta flotante (Hover Card Thumbnail)
    setTimeout(() => {
      updateTabThumbnail(tabData);
      if (typeof saveCurrentSession === 'function') saveCurrentSession();
    }, 600);
  });

  webviewEl.addEventListener('page-title-updated', (e) => {
    let t = e.title || 'Nueva pestaña';
    if (t.toLowerCase() === 'nueva pestaña' || t.toLowerCase() === 'new tab' || t === 'about:blank') {
      t = 'Nueva pestaña';
    }
    tabData.title = t;
    updateHistoryTitle(tabData.url, t);
    const titleEl = tabEl.querySelector('.tab-title');
    if (titleEl) {
      titleEl.textContent = tabData.isSleeping ? `🌙 ${tabData.title}` : tabData.title;
    }
    if (activeTabId === id) {
      document.title = `${tabData.title} - Brave Browser`;
    }
  });

  webviewEl.addEventListener('page-favicon-updated', (e) => {
    const iconContainer = tabEl.querySelector('.tab-icon');
    if (!iconContainer) return;

    if (e.favicons && e.favicons.length > 0 && !tabData.url.includes('ntp.html')) {
      const img = document.createElement('img');
      img.src = e.favicons[0];
      img.width = 16;
      img.height = 16;
      img.style.borderRadius = '2px';
      img.onerror = () => {
        iconContainer.innerHTML = BRAVE_SHIELD_SVG;
      };
      iconContainer.innerHTML = '';
      iconContainer.appendChild(img);
    } else {
      iconContainer.innerHTML = BRAVE_SHIELD_SVG;
    }
  });

  webviewEl.addEventListener('did-fail-load', (e) => {
    if (e.errorCode !== -3 && initialUrl.includes('ntp.html') && webviewEl.src !== ntpUrl) {
      console.warn('[Brave-Replica] Webview falló, recargando con ntpUrl absoluto:', ntpUrl);
      webviewEl.src = ntpUrl;
    } else if (tabData.url && tabData.url.includes('youtube.com') && (e.errorCode === -105 || e.errorCode === -106 || e.errorCode === -102)) {
      console.warn('[YouTube Recovery] Error de conexión transitorio en YouTube, autorecuperando...');
      setTimeout(() => webviewEl.reload(), 400);
    } else if (tabData.url && (e.errorCode === -105 || e.errorCode === -106 || e.errorCode === -102 || e.errorCode === -101 || e.errorCode === -501)) {
      if (activeTabId === id) {
        showWaybackBar(tabData.url);
      }
    }
  });

  webviewEl.addEventListener('found-in-page', (e) => {
    if (activeTabId === id) {
      const countEl = document.getElementById('find-in-page-count');
      if (countEl) {
        countEl.textContent = e.result.matches > 0 ? `${e.result.activeMatchOrdinal} de ${e.result.matches}` : '0/0';
      }
    }
  });

  webviewEl.addEventListener('did-navigate', (e) => {
    // Si la pestaña está hibernada (Memory Saver), no sobreescribir la URL real con about:blank
    if (tabData.isSleeping && (e.url === 'about:blank' || !e.url)) {
      return;
    }

    // Restablecer estado de audio de la página anterior
    tabData.isAudible = false;
    updateTabAudioUI();

    tabData.url = e.url;
    tabData.savedUrl = e.url;
    tabData.domain = extractDomain(e.url);
    tabData.lastActiveTime = Date.now();

    recordHistory(e.url, tabData.title);

    // Restaurar estado de scroll instantáneo desde BFCache
    restoreTabBFCache(tabData, e.url);

    // Mantener modo oscuro forzado tras navegación
    if (isForceDarkEnabled) {
      applyForceDarkToTab(tabData, true);
    }

    if (activeTabId === id) {
      updateOmniboxForUrl(e.url);
      queryShieldsStatus(tabData.domain);
      // Detección de errores HTTP 404/500 para rescate con Wayback Machine
      if (e.httpResponseCode && [404, 408, 410, 451, 500, 502, 503, 504].includes(e.httpResponseCode)) {
        showWaybackBar(e.url);
      } else {
        hideWaybackBar();
      }
    }

    setTimeout(() => {
      updateTabThumbnail(tabData);
    }, 800);
  });

  webviewEl.addEventListener('did-navigate-in-page', (e) => {
    tabData.url = e.url;
    tabData.savedUrl = e.url;
    if (activeTabId === id) {
      updateOmniboxForUrl(e.url);
    }
  });

  webviewEl.addEventListener('new-window', (e) => {
    const isBg = e.disposition === 'background-tab';
    createTab(e.url, { background: isBg });
  });

  // Inyección de API bridge para todas las páginas internas (brave://...)
  webviewEl.addEventListener('dom-ready', () => {
    const curUrl = webviewEl.getURL() || '';
    if (curUrl.startsWith('file://')) {
      const bridgeScript = `
        (function() {
          if (window.__brave_bridge_injected) return;
          window.__brave_bridge_injected = true;
          window.__brave_rpc_callbacks = window.__brave_rpc_callbacks || {};
          window.__brave_call = function(action, args) {
            return new Promise((resolve, reject) => {
              const callId = Math.random().toString(36).substring(2);
              window.__brave_rpc_callbacks[callId] = { resolve, reject };
              console.log('__BRAVE_RPC__:' + JSON.stringify({ callId, action, args: args || [] }));
            });
          };
          window.__brave_rpc_respond = function(callId, success, result, error) {
            const cb = window.__brave_rpc_callbacks[callId];
            if (cb) {
              delete window.__brave_rpc_callbacks[callId];
              if (success) cb.resolve(result);
              else cb.reject(new Error(error || 'RPC Error'));
            }
          };
          window.braveAPI = window.braveAPI || {};

          // Extensiones y Reglas
          window.braveAPI.listExtensions = () => window.__brave_call('listExtensions');
          window.braveAPI.loadUnpackedExtension = () => window.__brave_call('loadUnpackedExtension');
          window.braveAPI.toggleExtension = (id, enabled) => window.__brave_call('toggleExtension', [id, enabled]);
          window.braveAPI.removeExtension = (id) => window.__brave_call('removeExtension', [id]);
          window.braveAPI.installPresetExtension = (key) => window.__brave_call('installPresetExtension', [key]);
          window.braveAPI.downloadStoreExtension = (idOrUrl) => window.__brave_call('downloadStoreExtension', [idOrUrl]);
          window.braveAPI.syncCustomRules = (text) => window.__brave_call('syncCustomRules', [text]);

          // Pipeline de Descargas
          window.braveAPI.getDownloads = () => window.__brave_call('getDownloads');
          window.braveAPI.clearDownloads = () => window.__brave_call('clearDownloads');
          window.braveAPI.deleteDownload = (id) => window.__brave_call('deleteDownload', [id]);
          window.braveAPI.openPath = (path) => window.__brave_call('openPath', [path]);
          window.braveAPI.showItemInFolder = (path) => window.__brave_call('showItemInFolder', [path]);
          window.braveAPI.openDownloadsFolder = () => window.__brave_call('openDownloadsFolder');
          window.braveAPI.cancelDownload = (id) => window.__brave_call('cancelDownload', [id]);

          // Historial de Navegación
          window.braveAPI.getHistory = () => window.__brave_call('getHistory');
          window.braveAPI.clearHistory = () => window.__brave_call('clearHistory');
          window.braveAPI.deleteHistoryItem = (idx) => window.__brave_call('deleteHistoryItem', [idx]);

          // Estadísticas y Versión
          window.braveAPI.getShieldsStats = () => window.__brave_call('getSavingsStats');
          window.braveAPI.getVersionInfo = () => window.__brave_call('getVersionInfo');

          // Gestor de Marcadores y Carpetas
          window.braveAPI.getBookmarks = () => window.__brave_call('getBookmarks');
          window.braveAPI.saveBookmarks = (list) => window.__brave_call('saveBookmarks', [list]);
          window.braveAPI.getBookmarkFolders = () => window.__brave_call('getBookmarkFolders');
          window.braveAPI.saveBookmarkFolders = (folders) => window.__brave_call('saveBookmarkFolders', [folders]);

          // Gestor de Contraseñas
          window.braveAPI.getPasswords = () => window.__brave_call('getPasswords');
          window.braveAPI.savePasswords = (list) => window.__brave_call('savePasswords', [list]);
          window.braveAPI.deletePassword = (domain, username) => window.__brave_call('deletePassword', [domain, username]);
          window.braveAPI.clearPasswords = () => window.__brave_call('clearPasswords');

          // Brave Playlist
          window.braveAPI.getPlaylist = () => window.__brave_call('getPlaylist');
          window.braveAPI.savePlaylist = (items) => window.__brave_call('savePlaylist', [items]);
          window.braveAPI.deletePlaylistItem = (id) => window.__brave_call('deletePlaylistItem', [id]);
          window.braveAPI.clearPlaylist = () => window.__brave_call('clearPlaylist');

          // Perfil y Autocompletado
          window.braveAPI.getProfile = () => window.__brave_call('getProfile');
          window.braveAPI.saveProfile = (prof) => window.__brave_call('saveProfile', [prof]);

          // Configuración en Vivo
          window.braveAPI.getSettings = () => window.__brave_call('getSettings');
          window.braveAPI.updateSetting = (key, val) => window.__brave_call('updateSetting', [key, val]);
          window.braveAPI.clearBrowsingData = (opts) => window.__brave_call('clearBrowsingData', [opts]);
          window.braveAPI.openWindow = (url) => window.__brave_call('openWindow', [url]);
          window.braveAPI.openPrivateWindow = (url) => window.__brave_call('openPrivateWindow', [url]);

          window.dispatchEvent(new CustomEvent('brave-bridge-ready'));
          if (typeof loadExtensions === 'function') {
            loadExtensions();
          }
        })();
      `;
      webviewEl.executeJavaScript(bridgeScript).catch(() => {});
    } else if (!curUrl.startsWith('file://')) {
      // Inyección de interceptor de formularios de contraseña
      const pwDetectorScript = `
        (function() {
          if (window.__brave_pw_injected) return;
          window.__brave_pw_injected = true;
          document.addEventListener('submit', function(e) {
            try {
              const form = e.target;
              const pwInput = form.querySelector('input[type="password"]');
              if (!pwInput || !pwInput.value) return;
              const userInput = form.querySelector('input[type="email"], input[type="text"], input[name*="user" i], input[name*="email" i], input[name*="login" i]');
              const username = userInput ? userInput.value : '';
              const password = pwInput.value;
              console.log('__BRAVE_PW_SUBMIT__:' + JSON.stringify({ username, password }));
            } catch(err) {}
          }, true);
        })();
      `;
      webviewEl.executeJavaScript(pwDetectorScript).catch(() => {});

      // Autofill de credenciales guardadas para el dominio actual
      try {
        const savedPwList = JSON.parse(localStorage.getItem('brave_passwords') || '[]');
        const curDomain = tabData.domain ? tabData.domain.toLowerCase() : '';
        const match = savedPwList.find((p) => p.domain && curDomain && p.domain.toLowerCase() === curDomain);
        if (match) {
          const autofillScript = `
            (function() {
              const pwInput = document.querySelector('input[type="password"]');
              if (!pwInput) return;
              const form = pwInput.form || pwInput.closest('form') || document;
              const userInput = form.querySelector('input[type="email"], input[type="text"], input[name*="user" i], input[name*="email" i], input[name*="login" i]');
              if (userInput && !userInput.value) {
                userInput.value = ${JSON.stringify(match.username)};
                userInput.dispatchEvent(new Event('input', { bubbles: true }));
                userInput.dispatchEvent(new Event('change', { bubbles: true }));
              }
              if (pwInput && !pwInput.value) {
                pwInput.value = ${JSON.stringify(match.password)};
                pwInput.dispatchEvent(new Event('input', { bubbles: true }));
                pwInput.dispatchEvent(new Event('change', { bubbles: true }));
              }
            })();
          `;
          webviewEl.executeJavaScript(autofillScript).catch(() => {});
        }
      } catch {}

      // Autofill de Perfil Personal de Contacto y Dirección
      try {
        const savedProf = JSON.parse(localStorage.getItem('brave_autofill_profile') || '{}');
        if (savedProf.name || savedProf.email || savedProf.address) {
          const profileScript = `
            (function() {
              if (window.__brave_profile_injected) return;
              window.__brave_profile_injected = true;
              const prof = ${JSON.stringify(savedProf)};

              function fillField(input, val) {
                if (!input || !val || input.value) return;
                input.value = val;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }

              document.addEventListener('focusin', function(e) {
                const el = e.target;
                if (!el || el.tagName !== 'INPUT' || el.type === 'password' || el.type === 'hidden') return;
                const name = (el.name || el.id || el.getAttribute('autocomplete') || el.placeholder || '').toLowerCase();

                if (name.includes('name') || name.includes('nombre')) {
                  if (prof.name) fillField(el, prof.name);
                } else if (name.includes('email') || name.includes('correo') || el.type === 'email') {
                  if (prof.email) fillField(el, prof.email);
                } else if (name.includes('phone') || name.includes('tel') || el.type === 'tel') {
                  if (prof.phone) fillField(el, prof.phone);
                } else if (name.includes('address') || name.includes('direcci') || name.includes('street')) {
                  if (prof.address) fillField(el, prof.address);
                } else if (name.includes('city') || name.includes('ciudad')) {
                  if (prof.city) fillField(el, prof.city);
                } else if (name.includes('zip') || name.includes('postal')) {
                  if (prof.zip) fillField(el, prof.zip);
                } else if (name.includes('country') || name.includes('pais')) {
                  if (prof.country) fillField(el, prof.country);
                }
              }, true);
            })();
          `;
          webviewEl.executeJavaScript(profileScript).catch(() => {});
        }
      } catch {}
    }
  });

  webviewEl.addEventListener('console-message', async (e) => {
    if (e.message && e.message.startsWith('__BRAVE_PW_SUBMIT__:')) {
      try {
        const data = JSON.parse(e.message.slice(20));
        promptSavePassword(tabData, data.username, data.password);
      } catch {}
      return;
    }

    if (e.message && e.message.startsWith('__BRAVE_RPC__:')) {
      try {
        const payload = JSON.parse(e.message.slice(14));
        const { callId, action, args = [] } = payload;
        let result = null;
        let handled = true;

        if (action === 'getDownloads') {
          result = JSON.parse(localStorage.getItem('brave_downloads') || '[]');
        } else if (action === 'clearDownloads') {
          localStorage.removeItem('brave_downloads');
          result = true;
        } else if (action === 'deleteDownload') {
          const dlId = args[0];
          const list = JSON.parse(localStorage.getItem('brave_downloads') || '[]');
          const filtered = list.filter((item) => item.id !== dlId);
          localStorage.setItem('brave_downloads', JSON.stringify(filtered));
          result = true;
        } else if (action === 'getHistory') {
          result = JSON.parse(localStorage.getItem('brave_browser_history') || '[]');
        } else if (action === 'clearHistory') {
          localStorage.removeItem('brave_browser_history');
          result = true;
        } else if (action === 'deleteHistoryItem') {
          const target = args[0];
          const list = JSON.parse(localStorage.getItem('brave_browser_history') || '[]');
          let filtered = list;
          if (typeof target === 'string') {
            filtered = list.filter((item) => item.id !== target && item.url !== target);
          } else if (typeof target === 'number' && target >= 0 && target < list.length) {
            list.splice(target, 1);
            filtered = list;
          }
          localStorage.setItem('brave_browser_history', JSON.stringify(filtered));
          result = true;
        } else if (action === 'getBookmarks') {
          result = JSON.parse(localStorage.getItem('brave_bookmarks') || '[]');
        } else if (action === 'saveBookmarks') {
          const newList = args[0] || [];
          localStorage.setItem('brave_bookmarks', JSON.stringify(newList));
          bookmarks = newList;
          renderBookmarksBar();
          result = true;
        } else if (action === 'getBookmarkFolders') {
          result = JSON.parse(localStorage.getItem('brave_bookmark_folders') || '["Favoritos", "Trabajo"]');
        } else if (action === 'saveBookmarkFolders') {
          const folders = args[0] || ['Favoritos', 'Trabajo'];
          localStorage.setItem('brave_bookmark_folders', JSON.stringify(folders));
          result = true;
        } else if (action === 'getPasswords') {
          result = JSON.parse(localStorage.getItem('brave_passwords') || '[]');
        } else if (action === 'savePasswords') {
          const pwList = args[0] || [];
          localStorage.setItem('brave_passwords', JSON.stringify(pwList));
          result = true;
        } else if (action === 'deletePassword') {
          const [d, u] = args;
          const pwList = JSON.parse(localStorage.getItem('brave_passwords') || '[]');
          const filtered = pwList.filter((p) => !(p.domain === d && p.username === u));
          localStorage.setItem('brave_passwords', JSON.stringify(filtered));
          result = true;
        } else if (action === 'clearPasswords') {
          localStorage.removeItem('brave_passwords');
          result = true;
        } else if (action === 'getPlaylist') {
          result = JSON.parse(localStorage.getItem('brave_playlist_items') || '[]');
        } else if (action === 'savePlaylist') {
          const pl = args[0] || [];
          localStorage.setItem('brave_playlist_items', JSON.stringify(pl));
          result = true;
        } else if (action === 'deletePlaylistItem') {
          const plId = args[0];
          const pl = JSON.parse(localStorage.getItem('brave_playlist_items') || '[]');
          const filtered = pl.filter((item) => item.id !== plId && item.url !== plId);
          localStorage.setItem('brave_playlist_items', JSON.stringify(filtered));
          result = true;
        } else if (action === 'clearPlaylist') {
          localStorage.removeItem('brave_playlist_items');
          result = true;
        } else if (action === 'getProfile') {
          result = JSON.parse(localStorage.getItem('brave_autofill_profile') || '{}');
        } else if (action === 'saveProfile') {
          localStorage.setItem('brave_autofill_profile', JSON.stringify(args[0] || {}));
          result = true;
        } else if (action === 'getSettings') {
          result = {
            theme: localStorage.getItem('brave_theme') || 'dark',
            accent: localStorage.getItem('brave_accent') || 'orange',
            searchEngine: localStorage.getItem('brave_setting_engine') || 'brave',
            shieldsLevel: localStorage.getItem('brave_setting_level') || 'standard',
            farbling: localStorage.getItem('brave_setting_farbling') !== 'false',
            queryStrip: localStorage.getItem('brave_setting_query') !== 'false',
            tabSnooze: localStorage.getItem('brave_tab_snooze') || '30',
            startupMode: localStorage.getItem('brave_startup_mode') || 'continue',
            syncPhrase: localStorage.getItem('brave_sync_phrase') || '',
          };
        } else if (action === 'updateSetting') {
          const [key, val] = args;
          localStorage.setItem(key, String(val));
          if (key === 'brave_theme' && typeof applyTheme === 'function') applyTheme(val);
          if (key === 'brave_accent' && typeof applyAccent === 'function') applyAccent(val);
          if (key === 'brave_setting_engine') currentSearchEngine = val;
          result = true;
        } else if (action === 'clearBrowsingData') {
          const opts = args[0] || {};
          const dTypes = opts.dataTypes || [];
          if (dTypes.includes('history')) {
            localStorage.removeItem('brave_browser_history');
          }
          if (dTypes.includes('storage') || dTypes.includes('cookies')) {
            localStorage.removeItem('brave_site_permissions');
          }
          if (window.braveAPI && window.braveAPI.clearBrowsingData) {
            result = await window.braveAPI.clearBrowsingData(opts);
          } else {
            result = { success: true };
          }
        } else if (window.braveAPI && typeof window.braveAPI[action] === 'function') {
          result = await window.braveAPI[action](...args);
        } else {
          handled = false;
        }

        if (handled) {
          webviewEl.executeJavaScript(
            `window.__brave_rpc_respond && window.__brave_rpc_respond(${JSON.stringify(callId)}, true, ${JSON.stringify(result)});`
          ).catch(() => {});
        } else {
          webviewEl.executeJavaScript(
            `window.__brave_rpc_respond && window.__brave_rpc_respond(${JSON.stringify(callId)}, false, null, "Acción no disponible");`
          ).catch(() => {});
        }
      } catch (rpcErr) {
        console.error('[Brave Bridge] Error en RPC:', rpcErr);
      }
    }
  });

  if (!options.background) {
    switchTab(id);
  } else {
    tabData.webviewEl.classList.add('hidden');
    tabData.webviewEl.style.visibility = 'hidden';
    tabData.webviewEl.style.opacity = '0';
    tabData.webviewEl.style.pointerEvents = 'none';
    tabData.webviewEl.style.zIndex = '0';
    tabData.webviewEl.style.top = '-99999px';
    tabData.webviewEl.style.left = '-99999px';
    throttleBackgroundTab(tabData);
  }
  return tabData;
}

function applyTabPinnedState(tabData, isPinned) {
  tabData.isPinned = isPinned;
  if (isPinned) {
    tabData.tabEl.classList.add('pinned');
    tabData.tabEl.title = tabData.title || 'Pestaña fijada';
  } else {
    tabData.tabEl.classList.remove('pinned');
    tabData.tabEl.title = '';
  }
  reorderTabBarElements();
  try {
    const pinnedList = tabs.filter((t) => t.isPinned).map((t) => ({ url: t.url, title: t.title }));
    localStorage.setItem('brave_pinned_tabs', JSON.stringify(pinnedList));
  } catch {}
}

function reorderTabBarElements() {
  tabs.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  // Reinsertar en orden en tabBar
  tabs.forEach((t) => {
    tabBar.appendChild(t.tabEl);
  });
}

// ==========================================
// CACHÉ INSTANTÁNEO ATRÁS / ADELANTE (BFCache)
// ==========================================
function saveCurrentTabScrollState(tabData) {
  if (!tabData || !tabData.webviewEl || typeof tabData.webviewEl.executeJavaScript !== 'function' || !tabData.url || tabData.url.startsWith('file:') || tabData.url.startsWith('about:')) return;
  tabData.webviewEl.executeJavaScript('({ x: window.scrollX || 0, y: window.scrollY || 0 })').then((pos) => {
    if (pos && typeof pos.x === 'number') {
      tabData.bfCache.set(tabData.url, {
        scrollX: pos.x,
        scrollY: pos.y,
        title: tabData.title,
        timestamp: Date.now()
      });
    }
  }).catch(() => {});
}

function restoreTabBFCache(tabData, targetUrl) {
  if (!tabData || !tabData.webviewEl || !targetUrl) return;
  const cached = tabData.bfCache.get(targetUrl);
  if (!cached) return;

  if (cached.title && cached.title !== 'Página Web' && cached.title !== 'Nueva pestaña') {
    tabData.title = cached.title;
    const titleEl = tabData.tabEl.querySelector('.tab-title');
    if (titleEl) titleEl.textContent = cached.title;
  }

  setTimeout(() => {
    if (tabData && tabData.webviewEl && typeof tabData.webviewEl.executeJavaScript === 'function') {
      tabData.webviewEl.executeJavaScript(`window.scrollTo(${cached.scrollX}, ${cached.scrollY});`).catch(() => {});
    }
  }, 80);
}

// ==========================================
// SUPRESIÓN Y REPOSO EN SEGUNDO PLANO (Background Throttling)
// ==========================================
function throttleBackgroundTab(tabData) {
  if (!tabData || !tabData.webviewEl || typeof tabData.webviewEl.executeJavaScript !== 'function' || tabData.isAudible) return;
  tabData.webviewEl.executeJavaScript(`
    if (!window.__brave_throttled__) {
      window.__brave_throttled__ = true;
      document.body && document.body.setAttribute('data-brave-background', 'true');
    }
  `).catch(() => {});
}

function resumeTabExecution(tabData) {
  if (!tabData || !tabData.webviewEl || typeof tabData.webviewEl.executeJavaScript !== 'function') return;
  tabData.webviewEl.executeJavaScript(`
    if (window.__brave_throttled__) {
      window.__brave_throttled__ = false;
      document.body && document.body.removeAttribute('data-brave-background');
    }
  `).catch(() => {});
}

function switchTab(id) {
  const previousTab = tabs.find((t) => t.id === activeTabId && t.id !== id);
  if (previousTab) {
    updateTabThumbnail(previousTab);
    saveCurrentTabScrollState(previousTab);
  }

  activeTabId = id;
  const currentTab = tabs.find((t) => t.id === id);
  if (!currentTab) return;

  currentTab.lastActiveTime = Date.now();

  // Si la pestaña estaba suspendida (Memory Saver), reactivarla
  if (currentTab.isSleeping) {
    wakeUpSleepingTab(currentTab);
  }

  if (isSplitViewActive) {
    updateSplitViewLayout();
  } else {
    tabs.forEach((t) => {
      if (t.id === id) {
        t.tabEl.classList.add('active');
        t.webviewEl.classList.remove('hidden');
        t.webviewEl.style.width = '100%';
        t.webviewEl.style.height = '100%';
        t.webviewEl.style.position = 'absolute';
        t.webviewEl.style.top = '0';
        t.webviewEl.style.left = '0';
        t.webviewEl.style.visibility = 'visible';
        t.webviewEl.style.opacity = '1';
        t.webviewEl.style.pointerEvents = 'auto';
        t.webviewEl.style.zIndex = '2';
        resumeTabExecution(t);
      } else {
        t.tabEl.classList.remove('active');
        t.webviewEl.classList.add('hidden');
        t.webviewEl.style.visibility = 'hidden';
        t.webviewEl.style.opacity = '0';
        t.webviewEl.style.pointerEvents = 'none';
        t.webviewEl.style.zIndex = '0';
        t.webviewEl.style.top = '-99999px';
        t.webviewEl.style.left = '-99999px';
        throttleBackgroundTab(t);
      }
    });
  }

  // Cerrar barras o paneles contextuales de la pestaña anterior
  if (speedreaderOverlay && speedreaderOverlay.classList.contains('active')) {
    speedreaderOverlay.classList.remove('active');
    if (btnSpeedreader) btnSpeedreader.classList.remove('active');
  }
  if (typeof closeFindInPage === 'function' && findInPageBar && findInPageBar.classList.contains('open')) {
    closeFindInPage();
  }
  if (translateBar && translateBar.classList.contains('active')) {
    translateBar.classList.remove('active');
  }
  if (typeof hideWaybackBar === 'function') {
    hideWaybackBar();
  }

  updateOmniboxForUrl(currentTab.url);
  updateNavControls();
  document.title = `${currentTab.title} - Brave Browser`;
  queryShieldsStatus(currentTab.domain);

  // Aplicar factor de zoom del dominio de la pestaña seleccionada
  const dom = currentTab.domain || extractDomain(currentTab.url);
  const zf = getStoredDomainZoom(dom);
  try {
    if (typeof currentTab.webviewEl.setZoomFactor === 'function') {
      currentTab.webviewEl.setZoomFactor(zf);
    }
  } catch {}
  currentTab.zoomFactor = zf;
  updateZoomUI(zf);
}

function closeTab(id) {
  const index = tabs.findIndex((t) => t.id === id);
  if (index === -1) return;

  const tabToRemove = tabs[index];
  if (tabToRemove.isPinned) return; // Pestañas fijadas no se cierran directamente

  if (isSplitViewActive && (splitSecondTabId === id || activeTabId === id)) {
    toggleSplitView();
  }

  if (tabToRemove && tabToRemove.url && !tabToRemove.url.includes('ntp.html')) {
    if (!isCurrentWindowPrivate()) {
      closedTabsStack.push({
        url: tabToRemove.url,
        title: tabToRemove.title,
      });
      if (closedTabsStack.length > 50) closedTabsStack.shift();
    }
  }

  tabToRemove.tabEl.remove();
  tabToRemove.webviewEl.remove();
  tabs.splice(index, 1);

  // Navegación Olvidadiza (Brave Forgetful Browsing):
  // Si no quedan más pestañas abiertas con este dominio, y la navegación olvidadiza está activa para el dominio:
  const domainToPurge = tabToRemove.domain;
  if (domainToPurge && window.braveAPI && window.braveAPI.getShieldsStatus) {
    const hasOtherSameDomain = tabs.some((t) => t.id !== id && t.domain === domainToPurge);
    if (!hasOtherSameDomain) {
      window.braveAPI.getShieldsStatus(domainToPurge).then((st) => {
        if (st && st.forgetful && window.braveAPI.clearDomainData) {
          window.braveAPI.clearDomainData(domainToPurge);
          showGlobalToast(`Cookies y datos de ${domainToPurge} eliminados (Navegación olvidadiza)`);
        }
      });
    }
  }

  if (tabs.length === 0) {
    createTab(ntpUrl);
  } else if (activeTabId === id) {
    const nextIndex = index < tabs.length ? index : tabs.length - 1;
    const nextTab = tabs[nextIndex];
    switchTab(nextTab.id);
  }
  if (typeof saveCurrentSession === 'function') saveCurrentSession();
}

// Doble clic en espacio vacío de la barra para crear nueva pestaña
tabBar.addEventListener('dblclick', (e) => {
  if (e.target === tabBar) {
    createTab(ntpUrl);
  }
});

function getActiveTab() {
  return tabs.find((t) => t.id === activeTabId);
}

function updateNavControls() {
  const tab = getActiveTab();
  if (!tab || !tab.webviewEl) return;
  const canBack = typeof tab.webviewEl.canGoBack === 'function' ? tab.webviewEl.canGoBack() : false;
  const canFwd = typeof tab.webviewEl.canGoForward === 'function' ? tab.webviewEl.canGoForward() : false;
  btnBack.disabled = !canBack;
  btnForward.disabled = !canFwd;
  updateBookmarkStarState();
}

function updateOmniboxForUrl(url) {
  if (!url || url.includes('ntp.html') || url === 'about:newtab' || url === 'brave://newtab' || url === 'about:blank') {
    urlInput.value = '';
    urlInput.placeholder = 'Buscar en la web o ingresar una URL...';
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Página de nueva pestaña de Brave';
  } else if (url.includes('history.html') || url === 'brave://history') {
    urlInput.value = 'brave://history';
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Historial de navegación de Brave';
  } else if (url.includes('downloads.html') || url === 'brave://downloads') {
    urlInput.value = 'brave://downloads';
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Descargas de Brave';
  } else if (url.includes('adblock.html') || url === 'brave://adblock') {
    urlInput.value = 'brave://adblock';
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Filtros de Brave Shields';
  } else if (url.includes('playlist.html') || url === 'brave://playlist') {
    urlInput.value = 'brave://playlist';
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Brave Playlist';
  } else if (url.includes('bookmarks.html') || url === 'brave://bookmarks') {
    urlInput.value = 'brave://bookmarks';
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Marcadores de Brave';
  } else if (url.includes('version.html') || url === 'brave://version') {
    urlInput.value = 'brave://version';
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Acerca de Brave - Versión y Diagnóstico';
  } else if (url.includes('extensions.html') || url === 'brave://extensions') {
    urlInput.value = 'brave://extensions';
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Extensiones de Brave';
  } else if (url.includes('settings.html') || url === 'brave://settings' || url === 'brave://sync') {
    urlInput.value = url.includes('#sync') ? 'brave://sync' : 'brave://settings';
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Configuración de Brave';
  } else if (url.includes('dweb.link/ipfs/') || url.includes('ipfs.io/ipfs/')) {
    const cid = url.split('/ipfs/')[1];
    urlInput.value = 'ipfs://' + (cid || '');
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Protocolo descentralizado IPFS';
  } else if (url.includes('dweb.link/ipns/') || url.includes('ipfs.io/ipns/')) {
    const name = url.split('/ipns/')[1];
    urlInput.value = 'ipns://' + (name || '');
    lockIcon.innerHTML = LOCK_SVG_BRAVE;
    lockIcon.title = 'Protocolo descentralizado IPNS';
  } else {
    urlInput.value = url;
    if (url.startsWith('https://')) {
      lockIcon.innerHTML = LOCK_SVG_SECURE;
      lockIcon.title = 'Ver información del sitio (Conexión segura HTTPS)';
    } else {
      lockIcon.innerHTML = LOCK_SVG_INSECURE;
      lockIcon.title = 'La conexión no es segura (HTTP)';
    }
  }
}

// ==========================================
// 5. SUSPENSIÓN DE PESTAÑAS (Memory Saver)
// ==========================================
function putTabToSleep(tabData) {
  if (tabData.isSleeping || tabData.id === activeTabId || tabData.isPinned) return;
  tabData.isSleeping = true;
  tabData.savedUrl = tabData.url;
  tabData.tabEl.classList.add('sleeping');

  const titleEl = tabData.tabEl.querySelector('.tab-title');
  if (titleEl && !titleEl.textContent.includes('🌙')) {
    titleEl.innerHTML = `<span class="tab-sleep-badge">🌙</span> ` + tabData.title;
  }

  // Liberar recursos pesados navegando temporalmente a about:blank
  tabData.webviewEl.src = 'about:blank';
}

function wakeUpSleepingTab(tabData) {
  tabData.isSleeping = false;
  tabData.tabEl.classList.remove('sleeping');

  const titleEl = tabData.tabEl.querySelector('.tab-title');
  if (titleEl) {
    titleEl.textContent = tabData.title;
  }

  if (tabData.savedUrl && tabData.savedUrl !== 'about:blank') {
    tabData.webviewEl.src = tabData.savedUrl;
  }
}

// Hibernación Automática de Pestañas Inactivas (Memory Saver)
setInterval(() => {
  const snoozeSetting = parseInt(localStorage.getItem('brave_tab_snooze') || '30', 10);
  if (snoozeSetting <= 0) return; // 0 = Desactivado
  const thresholdMs = snoozeSetting * 60 * 1000;
  const now = Date.now();

  tabs.forEach((tab) => {
    if (tab.id !== activeTabId && !tab.isPinned && !tab.isAudible && !tab.isSleeping) {
      if (tab.lastActiveTime && (now - tab.lastActiveTime > thresholdMs)) {
        const curUrl = tab.webviewEl.getURL() || tab.url;
        if (curUrl && !curUrl.includes('ntp.html')) {
          putTabToSleep(tab);
        }
      }
    }
  });
}, 30000);

// ==========================================
// 6. TARJETAS FLOTANTES CON VISTA PREVIA (Tab Hover Cards & Previews)
// ==========================================
function updateTabThumbnail(tabData) {
  if (!tabData || !tabData.webviewEl || tabData.isSleeping) return;
  try {
    if (typeof tabData.webviewEl.capturePage === 'function') {
      tabData.webviewEl.capturePage().then((image) => {
        if (image && !image.isEmpty()) {
          tabData.thumbnailUrl = image.toDataURL();
        }
      }).catch(() => {});
    }
  } catch {}
}

function showTabHoverCard(tabData, tabEl) {
  if (!tabHoverCard) return;
  const rect = tabEl.getBoundingClientRect();

  hoverCardTitle.textContent = tabData.title || 'Nueva pestaña';
  hoverCardDomain.textContent = tabData.domain || 'brave://newtab';

  // Vista previa gráfica en miniatura (Tab Thumbnail Preview)
  const previewImg = document.getElementById('hover-card-preview');
  const placeholder = document.getElementById('hover-card-placeholder');
  if (previewImg && placeholder) {
    if (tabData.thumbnailUrl) {
      previewImg.src = tabData.thumbnailUrl;
      previewImg.classList.add('has-image');
      placeholder.style.display = 'none';
    } else {
      previewImg.classList.remove('has-image');
      placeholder.style.display = 'flex';
      placeholder.textContent = tabData.domain || '🦁 Brave Tab';
      updateTabThumbnail(tabData);
    }
  }

  if (tabData.isSleeping) {
    hoverCardMem.textContent = `🌙 Suspendida • Ahorrando ~${tabData.estimatedMemoryMB} MB`;
    hoverCardStatus.textContent = 'Ahorro de memoria';
  } else {
    hoverCardMem.textContent = `💾 Memoria: ~${tabData.estimatedMemoryMB} MB`;
    hoverCardStatus.textContent = tabData.isAudible ? '🔊 Reproduciendo audio' : 'Activa';
  }

  let left = rect.left;
  if (left + 300 > window.innerWidth) {
    left = window.innerWidth - 310;
  }

  tabHoverCard.style.left = `${Math.max(10, left)}px`;
  tabHoverCard.style.top = `${rect.bottom + 6}px`;
  tabHoverCard.classList.add('visible');
}

function hideTabHoverCard() {
  if (tabHoverCard) tabHoverCard.classList.remove('visible');
}

// ==========================================
// 7. CONTROL GLOBAL DE MULTIMEDIA (Global Media Controls)
// ==========================================
btnGlobalMedia.addEventListener('click', (e) => {
  e.stopPropagation();
  closeSuggestions();
  shieldsPopup.classList.remove('open');
  mainMenu.classList.remove('open');
  globalMediaPopup.classList.toggle('open');
  updateGlobalMediaMenu();
});

const btnGlobalMuteAll = document.getElementById('btn-global-mute-all');
if (btnGlobalMuteAll) {
  btnGlobalMuteAll.addEventListener('click', () => {
    const audibleTabs = tabs.filter((t) => t.isAudible || t.isMuted);
    if (audibleTabs.length === 0) return;
    const shouldMute = audibleTabs.some((t) => !t.isMuted);
    audibleTabs.forEach((t) => {
      t.isMuted = shouldMute;
      if (t.webviewEl) t.webviewEl.setAudioMuted(shouldMute);
    });
    showGlobalToast(shouldMute ? '🔇 Todas las pestañas han sido silenciadas' : '🔊 Sonido reactivado en todas las pestañas');
    updateGlobalMediaMenu();
  });
}

function updateGlobalMediaMenu() {
  if (!globalMediaPopup) return;
  const audibleTabs = tabs.filter((t) => t.isAudible || t.isMuted);

  if (btnGlobalMuteAll) {
    if (audibleTabs.length === 0) {
      btnGlobalMuteAll.disabled = true;
      btnGlobalMuteAll.style.opacity = '0.5';
      btnGlobalMuteAll.textContent = '🔇 Silenciar todo';
    } else {
      btnGlobalMuteAll.disabled = false;
      btnGlobalMuteAll.style.opacity = '1';
      const anyUnmuted = audibleTabs.some((t) => !t.isMuted);
      btnGlobalMuteAll.textContent = anyUnmuted ? '🔇 Silenciar todo' : '🔊 Reactivar todo';
    }
  }

  if (audibleTabs.length === 0) {
    mediaCardsContainer.innerHTML = `
      <div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 14px 0;">
        No hay reproducción multimedia activa en este momento.
      </div>
    `;
    return;
  }

  mediaCardsContainer.innerHTML = '';
  audibleTabs.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'media-card';
    card.innerHTML = `
      <div class="media-card-header">
        <span>${t.isAudible ? '🔊' : '🔇'}</span>
        <div class="media-title">${t.title}</div>
      </div>
      <div style="font-size: 11px; color: var(--text-muted);">${t.domain}</div>
      <div class="media-controls-row">
        <button class="btn-media-action btn-media-play">${t.isAudible ? 'Pausar' : 'Reanudar'}</button>
        <button class="btn-media-action btn-media-mute">${t.isMuted ? 'Activar sonido' : 'Silenciar'}</button>
        <button class="btn-media-action btn-media-goto">Ir a pestaña</button>
      </div>
    `;

    card.querySelector('.btn-media-play').addEventListener('click', () => {
      t.webviewEl.executeJavaScript(`
        const v = document.querySelector('video, audio');
        if (v) { v.paused ? v.play() : v.pause(); }
      `).catch(() => {});
    });

    card.querySelector('.btn-media-mute').addEventListener('click', () => {
      t.isMuted = !t.isMuted;
      t.webviewEl.setAudioMuted(t.isMuted);
      updateGlobalMediaMenu();
    });

    card.querySelector('.btn-media-goto').addEventListener('click', () => {
      switchTab(t.id);
      globalMediaPopup.classList.remove('open');
    });

    mediaCardsContainer.appendChild(card);
  });
}

// ==========================================
// 8. MODO LECTURA BRAVE SPEEDREADER Y PERSONALIZACIÓN
// ==========================================
let srTheme = localStorage.getItem('brave_sr_theme') || 'dark';
let srFontSize = parseInt(localStorage.getItem('brave_sr_font_size') || '100', 10);
let srFontFamily = localStorage.getItem('brave_sr_font_family') || 'serif';

const speedreaderPillTime = document.getElementById('speedreader-pill-time');
const speedreaderPillWords = document.getElementById('speedreader-pill-words');
const srFontSizeLabel = document.getElementById('sr-font-size-label');
const srBtnFontDec = document.getElementById('sr-btn-font-dec');
const srBtnFontInc = document.getElementById('sr-btn-font-inc');
const srBtnFontFamily = document.getElementById('sr-btn-font-family');
const srThemeButtons = document.querySelectorAll('.sr-theme-btn');

function applySpeedreaderPrefs() {
  if (!speedreaderOverlay) return;
  speedreaderOverlay.classList.remove('theme-dark', 'theme-sepia', 'theme-light');
  speedreaderOverlay.classList.add(`theme-${srTheme}`);

  speedreaderOverlay.classList.remove('font-serif', 'font-sans');
  speedreaderOverlay.classList.add(`font-${srFontFamily}`);

  if (speedreaderContent) {
    speedreaderContent.style.fontSize = `${18 * (srFontSize / 100)}px`;
  }
  if (srFontSizeLabel) {
    srFontSizeLabel.textContent = `${srFontSize}%`;
  }
  if (srBtnFontFamily) {
    srBtnFontFamily.textContent = srFontFamily === 'serif' ? 'Serif' : 'Sans';
  }

  srThemeButtons.forEach((btn) => {
    if (btn.getAttribute('data-sr-theme') === srTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

srThemeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    srTheme = btn.getAttribute('data-sr-theme');
    localStorage.setItem('brave_sr_theme', srTheme);
    applySpeedreaderPrefs();
  });
});

if (srBtnFontDec) {
  srBtnFontDec.addEventListener('click', () => {
    srFontSize = Math.max(70, srFontSize - 10);
    localStorage.setItem('brave_sr_font_size', String(srFontSize));
    applySpeedreaderPrefs();
  });
}

if (srBtnFontInc) {
  srBtnFontInc.addEventListener('click', () => {
    srFontSize = Math.min(160, srFontSize + 10);
    localStorage.setItem('brave_sr_font_size', String(srFontSize));
    applySpeedreaderPrefs();
  });
}

if (srBtnFontFamily) {
  srBtnFontFamily.addEventListener('click', () => {
    srFontFamily = srFontFamily === 'serif' ? 'sans' : 'serif';
    localStorage.setItem('brave_sr_font_family', srFontFamily);
    applySpeedreaderPrefs();
  });
}

applySpeedreaderPrefs();

function toggleSpeedreader() {
  const tab = getActiveTab();
  if (!tab) return;

  if (speedreaderOverlay.classList.contains('active')) {
    speedreaderOverlay.classList.remove('active');
    btnSpeedreader.classList.remove('active');
    return;
  }

  tab.webviewEl.executeJavaScript(`
    (() => {
      // 1. Detección de metadatos del artículo
      const title = document.querySelector('h1')?.innerText?.trim() || 
                    document.querySelector('meta[property="og:title"]')?.content || 
                    document.title;

      const author = document.querySelector('meta[name="author"]')?.content || 
                     document.querySelector('.author, .byline, [rel="author"]')?.innerText?.trim() || 
                     '';

      const heroImg = document.querySelector('article img, main img, figure img, meta[property="og:image"]')?.src || 
                      document.querySelector('meta[property="og:image"]')?.content || 
                      '';

      // 2. Localizar el contenedor principal con heurísticas Readability
      const candidates = Array.from(document.querySelectorAll('article, [role="main"], main, .article-body, .post-content, .entry-content, .story-body'));
      let mainEl = candidates[0];

      if (!mainEl) {
        // Buscar el contenedor con mayor densidad de párrafos
        let maxScore = 0;
        document.querySelectorAll('div, section').forEach(el => {
          const pList = el.querySelectorAll(':scope > p, :scope > div > p');
          let score = 0;
          pList.forEach(p => { if (p.innerText.trim().length > 60) score += p.innerText.trim().length; });
          if (score > maxScore) {
            maxScore = score;
            mainEl = el;
          }
        });
      }

      if (!mainEl) mainEl = document.body;

      // 3. Clonar y limpiar elementos no deseados
      const clone = mainEl.cloneNode(true);
      clone.querySelectorAll('script, style, iframe, nav, footer, header, aside, .ad, .ads, .social-share, .comments, form, button').forEach(n => n.remove());

      // 4. Extraer elementos de lectura formateados (párrafos, subtítulos e imágenes)
      const contentParts = [];
      let totalWords = 0;

      clone.querySelectorAll('h2, h3, p, figure, img').forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'h2' || tag === 'h3') {
          const txt = el.innerText.trim();
          if (txt.length > 3) contentParts.push('<' + tag + '>' + txt + '</' + tag + '>');
        } else if (tag === 'p') {
          const txt = el.innerText.trim();
          if (txt.length > 35) {
            totalWords += txt.split(/\\s+/).length;
            contentParts.push('<p>' + txt + '</p>');
          }
        } else if (tag === 'img' && el.src && el.src.startsWith('http')) {
          const alt = el.alt ? '<figcaption>' + el.alt + '</figcaption>' : '';
          contentParts.push('<figure><img src="' + el.src + '" alt="' + (el.alt || '') + '" style="max-width:100%; border-radius:8px; margin:16px 0;">' + alt + '</figure>');
        }
      });

      return {
        title,
        author,
        heroImg,
        totalWords,
        htmlContent: contentParts.join('')
      };
    })()
  `).then((data) => {
    if (!data || !data.htmlContent || data.totalWords < 40) {
      showGlobalToast('Speedreader: No se detectó un artículo legible en esta página.');
      return;
    }

    const readMin = Math.max(1, Math.round(data.totalWords / 200));
    speedreaderTitle.textContent = data.title || tab.title;
    speedreaderMeta.textContent = `${tab.domain}${data.author ? ' • Por ' + data.author : ''} • ~${readMin} min de lectura • Modo limpio sin anuncios`;
    if (speedreaderPillTime) speedreaderPillTime.textContent = `~${readMin} min de lectura`;
    if (speedreaderPillWords) speedreaderPillWords.textContent = `${data.totalWords} palabras`;
    speedreaderContent.innerHTML = data.htmlContent;
    applySpeedreaderPrefs();

    speedreaderOverlay.classList.add('active');
    btnSpeedreader.classList.add('active');
  }).catch(() => {
    showGlobalToast('No se pudo activar Speedreader en este sitio web.');
  });
}

btnSpeedreader.addEventListener('click', toggleSpeedreader);
btnCloseSpeedreader.addEventListener('click', () => {
  speedreaderOverlay.classList.remove('active');
  btnSpeedreader.classList.remove('active');
});

// ==========================================
// 9. BLOQUEADOR DE AVISOS DE COOKIES
// ==========================================
function injectCookieBannersAutoDismiss(webview) {
  webview.executeJavaScript(`
    (() => {
      const selectors = [
        '#onetrust-banner-sdk', '#onetrust-consent-sdk',
        '.cookie-banner', '#cookie-banner', '#cookie-notice',
        '.qc-cmp2-container', '.didomi-popup-container',
        '#cmpbox', '.cookie-law-info-bar', '.cc-banner'
      ];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });
    })()
  `).catch(() => {});
}

// ==========================================
// 10. MENÚS CONTEXTUALES PERSONALIZADOS
// ==========================================
function openTabContextMenu(x, y, tabId) {
  contextMenuTargetTabId = tabId;
  const targetTab = tabs.find((t) => t.id === tabId);
  if (!targetTab) return;

  const pinItem = document.getElementById('tab-ctx-pin');
  pinItem.textContent = targetTab.isPinned ? 'Desfijar pestaña' : 'Fijar pestaña';

  const muteItem = document.getElementById('tab-ctx-mute');
  muteItem.textContent = targetTab.isMuted ? 'Activar sonido de pestaña' : 'Silenciar pestaña';

  tabContextMenu.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
  tabContextMenu.style.top = `${Math.min(y, window.innerHeight - 300)}px`;
  tabContextMenu.classList.add('open');
  customContextMenu.classList.remove('open');
}

// Menú contextual nativo recibido desde el Webview
if (window.braveAPI && window.braveAPI.onContextMenu) {
  window.braveAPI.onContextMenu((params) => {
    contextMenuTargetData = params;
    openPageContextMenu(params.x, params.y, params);
  });
}

function openPageContextMenu(x, y, params) {
  const linkItem = document.getElementById('ctx-open-new-tab');
  const linkPrivateItem = document.getElementById('ctx-open-private-tab');
  const linkTorItem = document.getElementById('ctx-open-tor-tab');
  const copyLinkItem = document.getElementById('ctx-copy-link');
  const linkDivider = document.getElementById('ctx-link-divider');

  const searchItem = document.getElementById('ctx-search-selection');
  const copyItem = document.getElementById('ctx-copy-selection');
  const textDivider = document.getElementById('ctx-text-divider');

  const openImageItem = document.getElementById('ctx-open-image-tab');
  const copyImageItem = document.getElementById('ctx-copy-image-link');
  const imageDivider = document.getElementById('ctx-image-divider');

  const hasLink = Boolean(params && params.linkURL);
  const hasText = Boolean(params && params.selectionText && params.selectionText.trim());
  const hasImage = Boolean(params && (params.mediaType === 'image' || params.srcURL));

  linkItem.style.display = hasLink ? 'block' : 'none';
  linkPrivateItem.style.display = hasLink ? 'block' : 'none';
  linkTorItem.style.display = hasLink ? 'block' : 'none';
  copyLinkItem.style.display = hasLink ? 'block' : 'none';
  linkDivider.style.display = hasLink ? 'block' : 'none';

  if (openImageItem) openImageItem.style.display = hasImage ? 'block' : 'none';
  if (copyImageItem) copyImageItem.style.display = hasImage ? 'block' : 'none';
  if (imageDivider) imageDivider.style.display = hasImage ? 'block' : 'none';

  searchItem.style.display = hasText ? 'block' : 'none';
  copyItem.style.display = hasText ? 'block' : 'none';
  textDivider.style.display = hasText ? 'block' : 'none';

  if (hasText) {
    searchItem.textContent = `Buscar "${params.selectionText.substring(0, 18)}..." en ${getSearchEngineName()}`;
  }

  const contentRect = browserContent ? browserContent.getBoundingClientRect() : { left: 0, top: 0 };
  const actualX = x + (contentRect.left || 0);
  const actualY = y + (contentRect.top || 0);

  customContextMenu.style.left = `${Math.max(10, Math.min(actualX, window.innerWidth - 240))}px`;
  customContextMenu.style.top = `${Math.max(10, Math.min(actualY, window.innerHeight - 340))}px`;
  customContextMenu.classList.add('open');
  tabContextMenu.classList.remove('open');
}

// Eventos de opciones de contexto de página
const ctxOpenImageTab = document.getElementById('ctx-open-image-tab');
if (ctxOpenImageTab) {
  ctxOpenImageTab.addEventListener('click', () => {
    if (contextMenuTargetData && contextMenuTargetData.srcURL) {
      createTab(contextMenuTargetData.srcURL);
    }
    customContextMenu.classList.remove('open');
  });
}

const ctxCopyImageLink = document.getElementById('ctx-copy-image-link');
if (ctxCopyImageLink) {
  ctxCopyImageLink.addEventListener('click', () => {
    if (contextMenuTargetData && contextMenuTargetData.srcURL) {
      navigator.clipboard.writeText(contextMenuTargetData.srcURL);
      showGlobalToast('Dirección de la imagen copiada');
    }
    customContextMenu.classList.remove('open');
  });
}
document.getElementById('ctx-open-new-tab').addEventListener('click', () => {
  if (contextMenuTargetData && contextMenuTargetData.linkURL) {
    createTab(contextMenuTargetData.linkURL);
  }
  customContextMenu.classList.remove('open');
});

document.getElementById('ctx-open-private-tab').addEventListener('click', () => {
  const targetUrl = contextMenuTargetData && contextMenuTargetData.linkURL;
  if (window.braveAPI && window.braveAPI.openPrivateWindow) {
    window.braveAPI.openPrivateWindow(targetUrl);
  }
  customContextMenu.classList.remove('open');
});

document.getElementById('ctx-open-tor-tab').addEventListener('click', () => {
  const targetUrl = contextMenuTargetData && contextMenuTargetData.linkURL;
  if (window.braveAPI && window.braveAPI.openTorWindow) {
    window.braveAPI.openTorWindow(targetUrl);
  }
  customContextMenu.classList.remove('open');
});

document.getElementById('ctx-copy-link').addEventListener('click', () => {
  if (contextMenuTargetData && contextMenuTargetData.linkURL) {
    navigator.clipboard.writeText(contextMenuTargetData.linkURL);
  }
  customContextMenu.classList.remove('open');
});

document.getElementById('ctx-search-selection').addEventListener('click', () => {
  if (contextMenuTargetData && contextMenuTargetData.selectionText) {
    createTab(getSearchEngineQueryUrl(contextMenuTargetData.selectionText));
  }
  customContextMenu.classList.remove('open');
});

document.getElementById('ctx-copy-selection').addEventListener('click', () => {
  if (contextMenuTargetData && contextMenuTargetData.selectionText) {
    navigator.clipboard.writeText(contextMenuTargetData.selectionText);
  }
  customContextMenu.classList.remove('open');
});

document.getElementById('ctx-nav-back').addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab && tab.webviewEl.canGoBack()) tab.webviewEl.goBack();
  customContextMenu.classList.remove('open');
});

document.getElementById('ctx-nav-forward').addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab && tab.webviewEl.canGoForward()) tab.webviewEl.goForward();
  customContextMenu.classList.remove('open');
});

document.getElementById('ctx-nav-reload').addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab) tab.webviewEl.reload();
  customContextMenu.classList.remove('open');
});

document.getElementById('ctx-speedreader').addEventListener('click', () => {
  toggleSpeedreader();
  customContextMenu.classList.remove('open');
});

// Picture-in-Picture
const ctxOpenPip = document.getElementById('ctx-open-pip');
if (ctxOpenPip) {
  ctxOpenPip.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.webviewEl) {
      tab.webviewEl.executeJavaScript(`
        (() => {
          const video = document.querySelector('video');
          if (video) {
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture();
            } else {
              video.requestPictureInPicture().catch(() => {});
            }
          }
        })()
      `).catch(() => {});
    }
    customContextMenu.classList.remove('open');
  });
}

// Split View desde Context Menu
const ctxSplitTab = document.getElementById('ctx-split-tab');
if (ctxSplitTab) {
  ctxSplitTab.addEventListener('click', () => {
    toggleSplitView();
    customContextMenu.classList.remove('open');
  });
}

// ==========================================
// SELECTOR VISUAL DE ELEMENTOS (Element Picker)
// ==========================================
function activateElementPicker() {
  const tab = getActiveTab();
  if (!tab || !tab.webviewEl) return;
  const pickerBar = document.getElementById('element-picker-bar');
  if (pickerBar) pickerBar.classList.add('active');

  tab.webviewEl.executeJavaScript(`
    (() => {
      if (window.__braveZapperActive) return;
      window.__braveZapperActive = true;

      const overlay = document.createElement('div');
      overlay.id = '__brave_zapper_highlight';
      overlay.style.cssText = 'position: absolute; pointer-events: none; z-index: 2147483647; border: 2.5px dashed var(--brave-orange, #fb542b); background: rgba(251, 84, 43, 0.22); transition: all 0.05s ease; box-shadow: 0 0 16px rgba(251, 84, 43, 0.55); border-radius: 4px;';
      document.documentElement.appendChild(overlay);

      let currentEl = null;

      function updatePos(e) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (!target || target === overlay || target === document.documentElement || target === document.body) return;
        currentEl = target;
        const r = target.getBoundingClientRect();
        overlay.style.top = (r.top + window.scrollY) + 'px';
        overlay.style.left = (r.left + window.scrollX) + 'px';
        overlay.style.width = r.width + 'px';
        overlay.style.height = r.height + 'px';
      }

      function getSelector(el) {
        if (el.id) return '#' + CSS.escape(el.id);
        let path = el.tagName.toLowerCase();
        const rawClass = typeof el.className === 'string'
          ? el.className
          : (el.className && typeof el.className.baseVal === 'string' ? el.className.baseVal : '');
        if (rawClass) {
          const classes = rawClass.trim().split(/\\s+/).filter(c => c && !c.startsWith('__brave'));
          if (classes.length > 0) {
            path += '.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
          }
        }
        return path;
      }

      return new Promise((resolve) => {
        function cleanup() {
          window.__braveZapperActive = false;
          document.removeEventListener('mousemove', updatePos, true);
          document.removeEventListener('click', onClick, true);
          document.removeEventListener('keydown', onKey, true);
          overlay.remove();
        }

        function onClick(e) {
          e.preventDefault();
          e.stopPropagation();
          if (currentEl) {
            const sel = getSelector(currentEl);
            currentEl.style.setProperty('display', 'none', 'important');
            cleanup();
            resolve(sel);
            return;
          }
          cleanup();
          resolve(null);
        }

        function onKey(e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            cleanup();
            resolve(null);
          }
        }

        document.addEventListener('mousemove', updatePos, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKey, true);
      });
    })()
  `).then((selector) => {
    if (pickerBar) pickerBar.classList.remove('active');
    if (selector && typeof selector === 'string') {
      const domain = tab.domain || 'sitio';
      const rule = `\n${domain}##${selector}`;
      const currentRules = localStorage.getItem('brave_custom_adblock_rules') || '';
      const updatedRules = currentRules + rule;
      localStorage.setItem('brave_custom_adblock_rules', updatedRules);
      if (window.braveAPI && window.braveAPI.syncCustomRules) {
        window.braveAPI.syncCustomRules(updatedRules);
      }
      tab.webviewEl.insertCSS(`${selector} { display: none !important; }`).catch(() => {});
      showGlobalToast(`🦁 Elemento bloqueado permanentemente (${selector})`);
      console.log('[Element Zapper] Regla cosmética persistente guardada y sincronizada:', rule);
    }
  }).catch(() => {
    if (pickerBar) pickerBar.classList.remove('active');
  });
}

const btnCancelPicker = document.getElementById('btn-cancel-picker');
if (btnCancelPicker) {
  btnCancelPicker.addEventListener('click', () => {
    const pickerBar = document.getElementById('element-picker-bar');
    if (pickerBar) pickerBar.classList.remove('active');
    const tab = getActiveTab();
    if (tab && tab.webviewEl) {
      tab.webviewEl.executeJavaScript(`
        if (window.__braveZapperActive) {
          const el = document.getElementById('__brave_zapper_highlight');
          if (el) el.remove();
          window.__braveZapperActive = false;
        }
      `).catch(() => {});
    }
  });
}

const ctxBlockElement = document.getElementById('ctx-block-element');
if (ctxBlockElement) {
  ctxBlockElement.addEventListener('click', () => {
    customContextMenu.classList.remove('open');
    activateElementPicker();
  });
}

// Desbloqueador de Copia y Clic Derecho Protegido (Force Copy & Selection)
const ctxForceCopy = document.getElementById('ctx-force-copy');
if (ctxForceCopy) {
  ctxForceCopy.addEventListener('click', () => {
    customContextMenu.classList.remove('open');
    const tab = getActiveTab();
    if (!tab || !tab.webviewEl) return;

    tab.webviewEl.executeJavaScript(`
      (() => {
        const style = document.createElement('style');
        style.innerHTML = '* { -webkit-user-select: text !important; user-select: text !important; }';
        document.documentElement.appendChild(style);

        const events = ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart', 'mousedown', 'mouseup'];
        events.forEach(type => {
          window.addEventListener(type, (e) => e.stopImmediatePropagation(), true);
          document.addEventListener(type, (e) => e.stopImmediatePropagation(), true);
        });

        document.oncontextmenu = null;
        document.oncopy = null;
        document.oncut = null;
        document.onselectstart = null;
        if (document.body) {
          document.body.oncontextmenu = null;
          document.body.oncopy = null;
          document.body.onselectstart = null;
        }
        return true;
      })()
    `).catch(() => {});
  });
}

const ctxTranslatePage = document.getElementById('ctx-translate-page');
if (ctxTranslatePage) {
  ctxTranslatePage.addEventListener('click', () => {
    customContextMenu.classList.remove('open');
    if (btnTranslate) btnTranslate.click();
    if (btnDoTranslate) btnDoTranslate.click();
  });
}

document.getElementById('ctx-add-bookmark').addEventListener('click', () => {
  addCurrentPageToBookmarks();
  customContextMenu.classList.remove('open');
});

document.getElementById('ctx-devtools').addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab) tab.webviewEl.openDevTools();
  customContextMenu.classList.remove('open');
});

// Eventos de opciones de contexto de pestaña
const tabCtxDuplicate = document.getElementById('tab-ctx-duplicate');
if (tabCtxDuplicate) {
  tabCtxDuplicate.addEventListener('click', () => {
    const tab = tabs.find((t) => t.id === contextMenuTargetTabId);
    if (tab) createTab(tab.url, false);
    tabContextMenu.classList.remove('open');
  });
}

const tabCtxReload = document.getElementById('tab-ctx-reload');
if (tabCtxReload) {
  tabCtxReload.addEventListener('click', () => {
    const tab = tabs.find((t) => t.id === contextMenuTargetTabId);
    if (tab && tab.webviewEl) tab.webviewEl.reload();
    tabContextMenu.classList.remove('open');
  });
}

const tabCtxCloseRight = document.getElementById('tab-ctx-close-right');
if (tabCtxCloseRight) {
  tabCtxCloseRight.addEventListener('click', () => {
    const targetIdx = tabs.findIndex((t) => t.id === contextMenuTargetTabId);
    if (targetIdx !== -1) {
      const toClose = tabs.slice(targetIdx + 1).filter((t) => !t.isPinned);
      toClose.forEach((t) => closeTab(t.id));
    }
    tabContextMenu.classList.remove('open');
  });
}

document.getElementById('tab-ctx-new-right').addEventListener('click', () => {
  createTab(ntpUrl);
  tabContextMenu.classList.remove('open');
});

document.getElementById('tab-ctx-pin').addEventListener('click', () => {
  const tab = tabs.find((t) => t.id === contextMenuTargetTabId);
  if (tab) {
    applyTabPinnedState(tab, !tab.isPinned);
  }
  tabContextMenu.classList.remove('open');
});

document.getElementById('tab-ctx-mute').addEventListener('click', () => {
  const tab = tabs.find((t) => t.id === contextMenuTargetTabId);
  if (tab) {
    tab.isMuted = !tab.isMuted;
    tab.webviewEl.setAudioMuted(tab.isMuted);
    const audioBtn = tab.tabEl.querySelector('.tab-audio-icon');
    if (audioBtn) {
      if (tab.isMuted) {
        audioBtn.style.display = 'inline-flex';
        audioBtn.textContent = '🔇';
        audioBtn.classList.add('muted');
        audioBtn.title = 'Reactivar sonido de la pestaña';
      } else if (tab.isAudible) {
        audioBtn.style.display = 'inline-flex';
        audioBtn.textContent = '🔊';
        audioBtn.classList.remove('muted');
        audioBtn.title = 'Silenciar pestaña';
      } else {
        audioBtn.style.display = 'none';
      }
    }
    updateGlobalMediaMenu();
  }
  tabContextMenu.classList.remove('open');
});

function assignTabGroup(tabId, color, groupName) {
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;
  tab.tabEl.classList.remove('in-group-orange', 'in-group-purple', 'in-group-blue', 'in-group-green');
  if (color) {
    tab.tabEl.classList.add(`in-group-${color}`);
    tab.groupId = `group-${color}`;
  } else {
    tab.groupId = null;
  }
}

document.getElementById('tab-ctx-group-orange').addEventListener('click', () => {
  assignTabGroup(contextMenuTargetTabId, 'orange', 'Trabajo');
  tabContextMenu.classList.remove('open');
});

document.getElementById('tab-ctx-group-purple').addEventListener('click', () => {
  assignTabGroup(contextMenuTargetTabId, 'purple', 'Investigación');
  tabContextMenu.classList.remove('open');
});

document.getElementById('tab-ctx-group-blue').addEventListener('click', () => {
  assignTabGroup(contextMenuTargetTabId, 'blue', 'Multimedia');
  tabContextMenu.classList.remove('open');
});

document.getElementById('tab-ctx-remove-group').addEventListener('click', () => {
  assignTabGroup(contextMenuTargetTabId, null);
  tabContextMenu.classList.remove('open');
});

document.getElementById('tab-ctx-sleep').addEventListener('click', () => {
  const tab = tabs.find((t) => t.id === contextMenuTargetTabId);
  if (tab) putTabToSleep(tab);
  tabContextMenu.classList.remove('open');
});

document.getElementById('tab-ctx-close').addEventListener('click', () => {
  if (contextMenuTargetTabId) closeTab(contextMenuTargetTabId);
  tabContextMenu.classList.remove('open');
});

document.getElementById('tab-ctx-close-others').addEventListener('click', () => {
  const toClose = tabs.filter((t) => t.id !== contextMenuTargetTabId && !t.isPinned);
  toClose.forEach((t) => closeTab(t.id));
  tabContextMenu.classList.remove('open');
});

// ==========================================
// 11. NAVEGACIÓN Y PREFIJOS RÁPIDOS (Bangs)
// ==========================================
function navigateTo(raw) {
  let target = raw.trim();
  if (!target) return;

  const lower = target.toLowerCase();

  // Búsquedas con Prefijos Rápidos (!bangs y :)
  if (lower.startsWith(':yt ') || lower.startsWith('!yt ')) {
    target = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(target.replace(/^[:!]yt\s+/i, '').trim());
  } else if (lower.startsWith(':w ') || lower.startsWith('!w ')) {
    target = 'https://es.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(target.replace(/^[:!]w\s+/i, '').trim());
  } else if (lower.startsWith(':g ') || lower.startsWith('!g ')) {
    target = 'https://www.google.com/search?q=' + encodeURIComponent(target.replace(/^[:!]g\s+/i, '').trim());
  } else if (lower.startsWith(':gh ') || lower.startsWith('!gh ')) {
    target = 'https://github.com/search?q=' + encodeURIComponent(target.replace(/^[:!]gh\s+/i, '').trim());
  } else if (lower.startsWith(':ddg ') || lower.startsWith('!ddg ') || lower.startsWith(':d ') || lower.startsWith('!d ')) {
    target = 'https://duckduckgo.com/?q=' + encodeURIComponent(target.replace(/^[:!](ddg|d)\s+/i, '').trim());
  } else if (lower.startsWith(':b ') || lower.startsWith('!b ')) {
    target = 'https://search.brave.com/search?q=' + encodeURIComponent(target.replace(/^[:!]b\s+/i, '').trim());
  } else if (lower.startsWith(':r ') || lower.startsWith('!r ')) {
    target = 'https://www.reddit.com/search/?q=' + encodeURIComponent(target.replace(/^[:!]r\s+/i, '').trim());
  } else if (lower.startsWith(':m ') || lower.startsWith('!m ')) {
    target = 'https://www.google.com/maps/search/' + encodeURIComponent(target.replace(/^[:!]m\s+/i, '').trim());
  }
  // Enrutamiento de URLs internas de Brave
  else if (lower === 'brave://settings' || lower === 'about:settings' || lower === 'chrome://settings') {
    target = settingsUrl;
  } else if (lower === 'brave://bookmarks' || lower === 'about:bookmarks' || lower === 'chrome://bookmarks') {
    target = bookmarksUrl;
  } else if (lower === 'brave://version' || lower === 'about:version' || lower === 'chrome://version') {
    target = versionUrl;
  } else if (lower === 'brave://history' || lower === 'about:history' || lower === 'chrome://history') {
    target = historyUrl;
  } else if (lower === 'brave://downloads' || lower === 'about:downloads' || lower === 'chrome://downloads') {
    target = downloadsUrl;
  } else if (lower === 'brave://rewards' || lower === 'about:rewards') {
    target = ntpUrl;
  } else if (lower === 'brave://adblock') {
    target = adblockUrl;
  } else if (lower === 'brave://playlist' || lower === 'about:playlist') {
    target = playlistUrl;
  } else if (lower === 'brave://extensions' || lower === 'about:extensions' || lower === 'chrome://extensions') {
    target = extensionsUrl;
  } else if (lower.startsWith('localhost') || lower.startsWith('127.0.0.1') || lower.startsWith('[::1]')) {
    target = 'http://' + target;
  } else if (lower === 'brave://sync') {
    target = settingsUrl + '#sync';
  } else if (lower === 'brave://shields') {
    target = settingsUrl + '#shields';
  } else if (lower === 'brave://privacy') {
    target = settingsUrl + '#privacy';
  } else if (lower === 'brave://autofill' || lower === 'brave://passwords') {
    target = settingsUrl + '#autofill';
  } else if (lower === 'brave://appearance') {
    target = settingsUrl + '#appearance';
  } else if (lower === 'brave://startup') {
    target = settingsUrl + '#startup';
  } else if (lower === 'brave://search') {
    target = settingsUrl + '#search';
  } else if (lower === 'brave://newtab' || lower === 'about:newtab' || lower === 'ntp.html' || lower === 'about:blank') {
    target = ntpUrl;
  } else if (lower.startsWith('ipfs://')) {
    const cid = target.replace(/^ipfs:\/\//i, '');
    target = `https://dweb.link/ipfs/${cid}`;
  } else if (lower.startsWith('ipns://')) {
    const name = target.replace(/^ipns:\/\//i, '');
    target = `https://dweb.link/ipns/${name}`;
  } else if (!/^https?:\/\//i.test(target)) {
    if (target.includes('.') && !target.includes(' ')) {
      target = 'https://' + target;
    } else {
      target = getSearchEngineQueryUrl(target);
    }
  }

  // Des-Rastreo de URLs y De-AMP Inmediato en Omnibox
  try {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      const u = new URL(target);
      const host = u.hostname.toLowerCase();
      if ((host.includes('google.') || host === 'www.google.com') && u.pathname === '/url') {
        const q = u.searchParams.get('q') || u.searchParams.get('url');
        if (q && /^https?:\/\//i.test(q)) target = q;
      } else if ((host.includes('google.') || host.includes('ampproject.org')) && u.pathname.startsWith('/amp/')) {
        const parts = u.pathname.replace(/^\/amp\/(s\/)?/, '');
        if (parts) target = 'https://' + parts + u.search + u.hash;
      } else if (host.includes('reddit.com') && u.pathname.includes('/out') && u.searchParams.has('url')) {
        const t = u.searchParams.get('url');
        if (t && /^https?:\/\//i.test(t)) target = t;
      }
    }
  } catch {}

  const tab = getActiveTab();
  if (tab) {
    tab.webviewEl.src = target;
  }
}

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    if (currentSuggestions.length > 0) {
      e.preventDefault();
      const next = (selectedSuggestionIndex + 1) % currentSuggestions.length;
      selectSuggestion(next);
      return;
    }
  }

  if (e.key === 'ArrowUp') {
    if (currentSuggestions.length > 0) {
      e.preventDefault();
      const prev = (selectedSuggestionIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
      selectSuggestion(prev);
      return;
    }
  }

  if (e.key === 'Enter') {
    if (selectedSuggestionIndex >= 0 && currentSuggestions[selectedSuggestionIndex]) {
      e.preventDefault();
      navigateTo(currentSuggestions[selectedSuggestionIndex].actionUrl);
      closeSuggestions();
      return;
    }
    closeSuggestions();
    navigateTo(urlInput.value);
    return;
  }

  if (e.key === 'Escape') {
    if (currentSuggestions.length > 0) {
      e.preventDefault();
      closeSuggestions();
      return;
    }
  }
});

btnBack.addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab && tab.webviewEl.canGoBack()) {
    saveCurrentTabScrollState(tab);
    tab.webviewEl.goBack();
  }
});

btnForward.addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab && tab.webviewEl.canGoForward()) {
    saveCurrentTabScrollState(tab);
    tab.webviewEl.goForward();
  }
});

btnReload.addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab) {
    if (btnReload.textContent === '✕') {
      tab.webviewEl.stop();
    } else {
      tab.webviewEl.reload();
    }
  }
});

btnHome.addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab) tab.webviewEl.src = ntpUrl;
});

newTabBtn.addEventListener('click', () => {
  createTab(ntpUrl);
});

// ==========================================
// 12. BRAVE SHIELDS Y MENÚ PRINCIPAL
// ==========================================
shieldsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  mainMenu.classList.remove('open');
  closeSuggestions();
  shieldsPopup.classList.toggle('open');
});

shieldsToggle.addEventListener('change', () => {
  const tab = getActiveTab();
  if (!tab || !tab.domain || !window.braveAPI) return;

  window.braveAPI.toggleShields(tab.domain).then((res) => {
    updateShieldsUI(res.enabled, tab.blockedCount);
    tab.webviewEl.reload();
  });
});

scriptsToggle.addEventListener('change', () => {
  const tab = getActiveTab();
  if (!tab || !tab.domain || !window.braveAPI) return;

  window.braveAPI.toggleScripts(tab.domain).then(() => {
    tab.webviewEl.reload();
  });
});

const forgetfulToggle = document.getElementById('forgetful-toggle');
if (forgetfulToggle) {
  forgetfulToggle.addEventListener('change', () => {
    const tab = getActiveTab();
    if (!tab || !tab.domain || !window.braveAPI || !window.braveAPI.toggleForgetful) return;
    window.braveAPI.toggleForgetful(tab.domain).then((res) => {
      showGlobalToast(
        res.forgetful
          ? `Navegación olvidadiza activada para ${tab.domain} (se limpiará al salir)`
          : `Navegación olvidadiza desactivada para ${tab.domain}`
      );
    });
  });
}

btnToggleAggressive.addEventListener('click', () => {
  const tab = getActiveTab();
  if (!tab || !tab.domain || !window.braveAPI) return;

  window.braveAPI.toggleAggressive(tab.domain).then((res) => {
    btnToggleAggressive.textContent = res.aggressive ? 'Agresivo' : 'Estándar';
    tab.webviewEl.reload();
  });
});

function queryShieldsStatus(domain) {
  if (!window.braveAPI || !domain || domain === 'Nueva Pestaña' || domain === 'Nueva pestaña') {
    updateShieldsUI(true, 0);
    popupDomain.textContent = 'Brave Shields Activo';
    return;
  }

  popupDomain.textContent = domain;
  window.braveAPI.getShieldsStatus(domain).then((status) => {
    updateShieldsUI(status.enabled, status.blockedCount, status);
    scriptsToggle.checked = status.scriptsBlocked || false;
    if (forgetfulToggle && status.forgetful !== undefined) {
      forgetfulToggle.checked = !!status.forgetful;
    }
    btnToggleAggressive.textContent = status.aggressive ? 'Agresivo' : 'Estándar';

    if (status.totalGlobal) {
      localStorage.setItem('brave_total_ads', String(status.totalGlobal));
    }
  });
}

function updateShieldsUI(enabled, count, statusData = {}) {
  shieldsCounter.textContent = count;
  popupBlockedCount.textContent = count;
  shieldsToggle.checked = enabled;

  // Actualización dinámica de ancho de banda y tiempo ganado
  const bandwidthVal = statusData.siteBandwidthMB || ((count * 34.2) / 1024).toFixed(1);
  const timeVal = statusData.siteTimeSaved || `${Math.round((count * 65) / 1000)} s`;

  const popBandwidth = document.getElementById('popup-bandwidth-saved');
  const popTime = document.getElementById('popup-time-saved');
  if (popBandwidth) popBandwidth.textContent = `${bandwidthVal} MB`;
  if (popTime) popTime.textContent = timeVal;

  if (statusData.globalBandwidthMB) {
    localStorage.setItem('brave_mb_saved', String(statusData.globalBandwidthMB));
  }
  if (statusData.globalTimeSaved) {
    localStorage.setItem('brave_time_saved', String(statusData.globalTimeSaved));
  }

  if (enabled) {
    shieldsBtn.classList.remove('disabled');
    shieldsCounter.style.display = count > 0 ? 'inline-block' : 'none';
  } else {
    shieldsBtn.classList.add('disabled');
    shieldsCounter.style.display = 'none';
  }
}

if (window.braveAPI) {
  window.braveAPI.onShieldsUpdate((data) => {
    const tab = getActiveTab();
    if (tab && tab.domain === data.domain) {
      tab.blockedCount = data.blockedCount;
      updateShieldsUI(data.enabled, data.blockedCount, data);
      if (data.scriptsBlocked !== undefined) {
        scriptsToggle.checked = !!data.scriptsBlocked;
      }
      if (forgetfulToggle && data.forgetful !== undefined) {
        forgetfulToggle.checked = !!data.forgetful;
      }
    }
    if (data.totalGlobal) {
      localStorage.setItem('brave_total_ads', String(data.totalGlobal));
      if (data.globalBandwidthMB) localStorage.setItem('brave_mb_saved', String(data.globalBandwidthMB));
      if (data.globalTimeSaved) localStorage.setItem('brave_time_saved', String(data.globalTimeSaved));
    }
  });
}

btnMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  shieldsPopup.classList.remove('open');
  closeSuggestions();
  globalMediaPopup.classList.remove('open');
  mainMenu.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!shieldsPopup.contains(e.target) && e.target !== shieldsBtn) {
    shieldsPopup.classList.remove('open');
  }
  if (!mainMenu.contains(e.target) && e.target !== btnMenu) {
    mainMenu.classList.remove('open');
  }
  if (globalMediaPopup && !globalMediaPopup.contains(e.target) && e.target !== btnGlobalMedia) {
    globalMediaPopup.classList.remove('open');
  }
  if (omniboxSuggestions && !omniboxSuggestions.contains(e.target) && e.target !== urlInput) {
    closeSuggestions();
  }
  if (customContextMenu) customContextMenu.classList.remove('open');
  if (tabContextMenu) tabContextMenu.classList.remove('open');
  if (tabSearchPopup && !tabSearchPopup.contains(e.target) && e.target !== tabSearchBtn) {
    tabSearchPopup.classList.remove('open');
  }
  if (profilePopup && !profilePopup.contains(e.target) && e.target !== btnProfile) {
    profilePopup.classList.remove('open');
  }
  const btnExtensionsEl = document.getElementById('btn-extensions');
  const extPopupEl = document.getElementById('extensions-popup');
  if (extPopupEl && !extPopupEl.contains(e.target) && e.target !== btnExtensionsEl) {
    extPopupEl.classList.remove('open');
  }
  const btnQrEl = document.getElementById('btn-qr-code');
  const qrPopupEl = document.getElementById('qr-popup');
  if (qrPopupEl && !qrPopupEl.contains(e.target) && e.target !== btnQrEl) {
    qrPopupEl.classList.remove('open');
  }
  if (batteryPopup && !batteryPopup.contains(e.target) && e.target !== batteryIndicator) {
    batteryPopup.classList.remove('open');
  }
  if (taskManagerModal && e.target === taskManagerModal) {
    closeTaskManager();
  }
});

const menuFind = document.getElementById('menu-find');
if (menuFind) {
  menuFind.addEventListener('click', () => {
    toggleFindInPage();
    mainMenu.classList.remove('open');
  });
}

document.getElementById('menu-new-tab').addEventListener('click', () => {
  createTab(ntpUrl);
  mainMenu.classList.remove('open');
});

const menuNewWindow = document.getElementById('menu-new-window');
if (menuNewWindow) {
  menuNewWindow.addEventListener('click', () => {
    if (window.braveAPI && window.braveAPI.openWindow) {
      window.braveAPI.openWindow();
    } else {
      createTab(ntpUrl);
    }
    mainMenu.classList.remove('open');
  });
}

document.getElementById('menu-new-private').addEventListener('click', () => {
  if (window.braveAPI) window.braveAPI.openPrivateWindow();
  mainMenu.classList.remove('open');
});

const menuNewTor = document.getElementById('menu-new-tor');
if (menuNewTor) {
  menuNewTor.addEventListener('click', () => {
    if (window.braveAPI && window.braveAPI.openTorWindow) window.braveAPI.openTorWindow();
    mainMenu.classList.remove('open');
  });
}

const menuBookmarks = document.getElementById('menu-bookmarks');
if (menuBookmarks) {
  menuBookmarks.addEventListener('click', () => {
    addCurrentPageToBookmarks();
    mainMenu.classList.remove('open');
  });
}

const menuToggleBookmarks = document.getElementById('menu-toggle-bookmarks');
if (menuToggleBookmarks) {
  menuToggleBookmarks.addEventListener('click', () => {
    toggleBookmarksBar();
    mainMenu.classList.remove('open');
  });
}

const menuHistory = document.getElementById('menu-history');
if (menuHistory) {
  menuHistory.addEventListener('click', () => {
    createTab(historyUrl);
    mainMenu.classList.remove('open');
  });
}

const menuDownloads = document.getElementById('menu-downloads');
if (menuDownloads) {
  menuDownloads.addEventListener('click', () => {
    createTab(downloadsUrl);
    mainMenu.classList.remove('open');
  });
}

const menuSync = document.getElementById('menu-sync');
if (menuSync) {
  menuSync.addEventListener('click', () => {
    createTab(settingsUrl + '#sync');
    mainMenu.classList.remove('open');
  });
}

const menuAdblock = document.getElementById('menu-adblock');
if (menuAdblock) {
  menuAdblock.addEventListener('click', () => {
    createTab(adblockUrl);
    mainMenu.classList.remove('open');
  });
}

document.getElementById('menu-settings').addEventListener('click', () => {
  createTab(settingsUrl);
  mainMenu.classList.remove('open');
});

document.getElementById('menu-devtools').addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab) tab.webviewEl.openDevTools();
  mainMenu.classList.remove('open');
});

const menuBookmarksManager = document.getElementById('menu-bookmarks-manager');
if (menuBookmarksManager) {
  menuBookmarksManager.addEventListener('click', () => {
    createTab(bookmarksUrl);
    mainMenu.classList.remove('open');
  });
}

document.getElementById('menu-about').addEventListener('click', () => {
  createTab(versionUrl);
  mainMenu.classList.remove('open');
});

const menuPlaylist = document.getElementById('menu-playlist');
if (menuPlaylist) {
  menuPlaylist.addEventListener('click', () => {
    createTab(playlistUrl);
    mainMenu.classList.remove('open');
  });
}

const menuExtensions = document.getElementById('menu-extensions');
if (menuExtensions) {
  menuExtensions.addEventListener('click', () => {
    createTab(extensionsUrl);
    mainMenu.classList.remove('open');
  });
}

const menuTaskManager = document.getElementById('menu-task-manager');
if (menuTaskManager) {
  menuTaskManager.addEventListener('click', () => {
    openTaskManager();
    mainMenu.classList.remove('open');
  });
}

const menuReopenTab = document.getElementById('menu-reopen-tab');
if (menuReopenTab) {
  menuReopenTab.addEventListener('click', () => {
    mainMenu.classList.remove('open');
    if (closedTabsStack.length > 0) {
      const restored = closedTabsStack.pop();
      createTab(restored.url);
      showGlobalToast(`Pestaña reabierta: ${restored.title || restored.url}`);
    } else {
      showGlobalToast('No hay pestañas cerradas recientemente');
    }
  });
}

const menuScreenshot = document.getElementById('menu-screenshot');
if (menuScreenshot) {
  menuScreenshot.addEventListener('click', () => {
    mainMenu.classList.remove('open');
    captureActivePage();
  });
}

const menuPrint = document.getElementById('menu-print');
if (menuPrint) {
  menuPrint.addEventListener('click', () => {
    mainMenu.classList.remove('open');
    printActivePage();
  });
}

// Crear acceso directo de aplicación / PWA
const menuCreateShortcut = document.getElementById('menu-create-shortcut');
const shortcutModal = document.getElementById('shortcut-modal');
const shortcutTitleInput = document.getElementById('shortcut-title-input');
const shortcutAsWindow = document.getElementById('shortcut-as-window');
const btnCancelShortcut = document.getElementById('btn-cancel-shortcut');
const btnConfirmShortcut = document.getElementById('btn-confirm-shortcut');

if (menuCreateShortcut && shortcutModal) {
  menuCreateShortcut.addEventListener('click', () => {
    mainMenu.classList.remove('open');
    const tab = getActiveTab();
    if (!tab) return;
    if (shortcutTitleInput) shortcutTitleInput.value = tab.title || tab.domain;
    shortcutModal.classList.add('open');
    if (shortcutTitleInput) shortcutTitleInput.focus();
  });
}

if (btnCancelShortcut && shortcutModal) {
  btnCancelShortcut.addEventListener('click', () => {
    shortcutModal.classList.remove('open');
  });
}

if (btnConfirmShortcut && shortcutModal) {
  btnConfirmShortcut.addEventListener('click', async () => {
    const tab = getActiveTab();
    if (!tab) return;
    const title = (shortcutTitleInput ? shortcutTitleInput.value.trim() : '') || tab.title || 'Brave App';
    const url = tab.url;
    const asWindow = shortcutAsWindow ? shortcutAsWindow.checked : true;

    shortcutModal.classList.remove('open');

    if (window.braveAPI && window.braveAPI.createDesktopShortcut) {
      await window.braveAPI.createDesktopShortcut({ url, title, openAsWindow: asWindow });
    }

    if (asWindow && window.braveAPI && window.braveAPI.createAppWindow) {
      await window.braveAPI.createAppWindow({ url, title });
    }

    showGlobalToast(`✓ Acceso directo creado en el Escritorio: ${title}`);
  });
}

// ==========================================
// 13. ATAJOS DE TECLADO COMPLETOS DEL ORIGINAL
// ==========================================
function handleBrowserShortcut(e) {
  const isCtrl = !!(e.ctrlKey || e.metaKey);
  const isShift = !!e.shiftKey;
  const isAlt = !!e.altKey;
  const code = e.code || '';
  const key = e.key ? e.key.toLowerCase() : '';

  const prevent = () => {
    if (typeof e.preventDefault === 'function') e.preventDefault();
  };

  const isT = code === 'KeyT' || key === 't';
  const isW = code === 'KeyW' || key === 'w';
  const isR = code === 'KeyR' || key === 'r';
  const isL = code === 'KeyL' || key === 'l';
  const isH = code === 'KeyH' || key === 'h';
  const isJ = code === 'KeyJ' || key === 'j';
  const isD = code === 'KeyD' || key === 'd';
  const isB = code === 'KeyB' || key === 'b';
  const isN = code === 'KeyN' || key === 'n';
  const isA = code === 'KeyA' || key === 'a';
  const isS = code === 'KeyS' || key === 's';
  const isP = code === 'KeyP' || key === 'p';
  const isTab = code === 'Tab' || key === 'tab';
  const isEsc = code === 'Escape' || e.key === 'Escape' || key === 'escape';
  const isF4 = code === 'F4' || e.key === 'F4' || key === 'f4';
  const isF5 = code === 'F5' || e.key === 'F5' || key === 'f5';
  const isF6 = code === 'F6' || e.key === 'F6' || key === 'f6';
  const isF11 = code === 'F11' || e.key === 'F11' || key === 'f11';
  const isF12 = code === 'F12' || e.key === 'F12' || key === 'f12';
  const isComma = code === 'Comma' || key === ',';
  const isF = code === 'KeyF' || key === 'f';
  const isE = code === 'KeyE' || key === 'e';
  const isO = code === 'KeyO' || key === 'o';
  const isI = code === 'KeyI' || key === 'i';
  const isDelete = code === 'Delete' || code === 'Backspace' || key === 'delete' || key === 'backspace';

  // Ctrl + F: Buscar en la página
  if (isCtrl && !isShift && isF) {
    prevent();
    toggleFindInPage();
    return;
  }

  // Ctrl + Tab / Ctrl + Shift + Tab / Ctrl + PageDown / Ctrl + PageUp
  if (isCtrl && (isTab || code === 'PageDown' || code === 'PageUp' || key === 'pagedown' || key === 'pageup')) {
    prevent();
    if (tabs.length > 1) {
      const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
      if (currentIndex !== -1) {
        let nextIndex;
        if (isShift || code === 'PageUp' || key === 'pageup') {
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        } else {
          nextIndex = (currentIndex + 1) % tabs.length;
        }
        switchTab(tabs[nextIndex].id);
      }
    }
    return;
  }

  // Ctrl + Shift + B: Alternar barra de marcadores
  if (isCtrl && isShift && isB) {
    prevent();
    toggleBookmarksBar();
    return;
  }

  // Alt + R: Activar/desactivar Speedreader
  if (isAlt && !isCtrl && isR) {
    prevent();
    toggleSpeedreader();
    return;
  }

  // Ctrl + Shift + T: Reabrir última pestaña cerrada
  if (isCtrl && isShift && isT) {
    prevent();
    if (closedTabsStack.length > 0) {
      const restored = closedTabsStack.pop();
      createTab(restored.url);
    }
    return;
  }

  // Ctrl + T: Nueva pestaña
  if (isCtrl && !isShift && isT) {
    prevent();
    createTab(ntpUrl);
    return;
  }

  // Ctrl + N: Nueva ventana
  if (isCtrl && !isShift && !isAlt && isN) {
    prevent();
    if (window.braveAPI && window.braveAPI.openWindow) {
      window.braveAPI.openWindow();
    } else {
      createTab(ntpUrl);
    }
    return;
  }

  // Ctrl + Shift + O: Gestor de marcadores
  if (isCtrl && isShift && isO) {
    prevent();
    createTab(bookmarksUrl);
    return;
  }

  // Ctrl + W o Ctrl + F4: Cerrar pestaña activa
  if ((isCtrl && !isShift && isW) || (isCtrl && isF4)) {
    prevent();
    if (activeTabId) closeTab(activeTabId);
    return;
  }

  // Ctrl + 1 a Ctrl + 8: Cambiar a pestaña por índice; Ctrl + 9: Cambiar a la última
  if (isCtrl && !isShift && !isAlt) {
    let digit = -1;
    if (e.key >= '1' && e.key <= '9') {
      digit = parseInt(e.key, 10);
    } else if (code.startsWith('Digit')) {
      digit = parseInt(code.replace('Digit', ''), 10);
    } else if (code.startsWith('Numpad')) {
      digit = parseInt(code.replace('Numpad', ''), 10);
    }
    if (digit >= 1 && digit <= 9) {
      prevent();
      if (digit === 9) {
        if (tabs.length > 0) switchTab(tabs[tabs.length - 1].id);
      } else {
        const targetTab = tabs[digit - 1];
        if (targetTab) switchTab(targetTab.id);
      }
      return;
    }
  }

  // Ctrl + L / Alt + D / F6: Enfocar barra de direcciones y seleccionar todo
  if ((isCtrl && !isShift && isL) || (isAlt && isD) || isF6) {
    prevent();
    urlInput.focus();
    urlInput.select();
    return;
  }

  // Ctrl + H: Abrir Historial
  if (isCtrl && !isShift && isH) {
    prevent();
    createTab(historyUrl);
    return;
  }

  // Ctrl + J: Abrir Descargas
  if (isCtrl && !isShift && isJ) {
    prevent();
    createTab(downloadsUrl);
    return;
  }

  // Alt + Shift + N: Ventana Privada con Tor
  if (isAlt && isShift && isN) {
    prevent();
    if (window.braveAPI && window.braveAPI.openTorWindow) window.braveAPI.openTorWindow();
    return;
  }

  // Ctrl + Shift + N: Ventana Privada normal
  if (isCtrl && isShift && isN) {
    prevent();
    if (window.braveAPI) window.braveAPI.openPrivateWindow();
    return;
  }

  // Ctrl + ,: Abrir Configuración
  if (isCtrl && !isShift && isComma) {
    prevent();
    createTab(settingsUrl);
    return;
  }

  // Ctrl + D: Añadir página actual a marcadores
  if (isCtrl && !isShift && isD) {
    prevent();
    addCurrentPageToBookmarks();
    return;
  }

  // Ctrl + R / F5: Recargar pestaña activa
  if ((isCtrl && isR) || isF5) {
    prevent();
    const tab = getActiveTab();
    if (tab) {
      if (isShift) {
        tab.webviewEl.reloadIgnoringCache();
      } else {
        tab.webviewEl.reload();
      }
    }
    return;
  }

  // Ctrl + P: Imprimir página web activa
  if (isCtrl && !isShift && isP) {
    prevent();
    printActivePage();
    return;
  }

  // Ctrl + Shift + S: Captura de pantalla web (Brave Web Capture)
  if (isCtrl && isShift && isS) {
    prevent();
    captureActivePage();
    return;
  }

  // Control de Zoom: Ctrl + +, Ctrl + -, Ctrl + 0
  const tab = getActiveTab();
  if (tab && isCtrl && !isShift) {
    if (code === 'Equal' || code === 'NumpadAdd' || e.key === '+' || e.key === '=') {
      prevent();
      const current = tab.zoomFactor || 1.0;
      applyCurrentTabZoom(current + 0.1, true);
      return;
    }
    if (code === 'Minus' || code === 'NumpadSubtract' || e.key === '-') {
      prevent();
      const current = tab.zoomFactor || 1.0;
      applyCurrentTabZoom(current - 0.1, true);
      return;
    }
    if (code === 'Digit0' || code === 'Numpad0' || e.key === '0') {
      prevent();
      applyCurrentTabZoom(1.0, true);
      return;
    }
  }

  // F11: Pantalla completa
  if (isF11) {
    prevent();
    if (window.braveAPI && window.braveAPI.toggleFullScreen) {
      window.braveAPI.toggleFullScreen();
    }
    return;
  }

  // F12 o Ctrl + Shift + I: Abrir DevTools
  if (isF12 || (isCtrl && isShift && isI)) {
    prevent();
    const t = getActiveTab();
    if (t) t.webviewEl.openDevTools();
    return;
  }

  // Shift + Esc: Administrador de Tareas interno
  if (isShift && isEsc) {
    prevent();
    openTaskManager();
    return;
  }

  // Ctrl + Shift + A: Buscador de Pestañas
  if (isCtrl && isShift && isA) {
    prevent();
    toggleTabSearch();
    return;
  }

  // Ctrl + Shift + E: Selector de Elementos (Element Picker)
  if (isCtrl && isShift && isE) {
    prevent();
    activateElementPicker();
    return;
  }

  // Ctrl + Shift + Supr / Backspace: Borrar datos de navegación
  if (isCtrl && isShift && isDelete) {
    prevent();
    openClearDataModal();
    return;
  }

  // Alt + S: Pantalla Dividida (Split View)
  if (isAlt && !isCtrl && isS) {
    prevent();
    toggleSplitView();
    return;
  }

  // Escape: Cerrar menús, sugerencias o desenfocar
  if (isEsc && !isShift && !isCtrl && !isAlt) {
    shieldsPopup.classList.remove('open');
    mainMenu.classList.remove('open');
    if (globalMediaPopup) globalMediaPopup.classList.remove('open');
    if (customContextMenu) customContextMenu.classList.remove('open');
    if (tabContextMenu) tabContextMenu.classList.remove('open');
    if (speedreaderOverlay) speedreaderOverlay.classList.remove('active');
    if (tabSearchPopup) tabSearchPopup.classList.remove('open');
    if (profilePopup) profilePopup.classList.remove('open');
    if (taskManagerModal) taskManagerModal.classList.remove('open');
    if (translateBar) translateBar.classList.remove('active');
    const extPopup = document.getElementById('extensions-popup');
    if (extPopup) extPopup.classList.remove('open');
    const qrPopup = document.getElementById('qr-popup');
    if (qrPopup) qrPopup.classList.remove('open');
    if (bmPopup) bmPopup.classList.remove('open');
    if (bmBarCtxMenu) bmBarCtxMenu.classList.remove('open');
    if (bmBarEditModal) bmBarEditModal.classList.remove('open');
    const siteInfoPop = document.getElementById('site-info-popup');
    if (siteInfoPop) siteInfoPop.classList.remove('open');
    const clearDataPop = document.getElementById('clear-data-modal');
    if (clearDataPop) clearDataPop.classList.remove('open');
    const pwPop = document.getElementById('password-save-popup');
    if (pwPop) pwPop.classList.remove('open');
    const pickerBar = document.getElementById('element-picker-bar');
    if (pickerBar) pickerBar.classList.remove('active');
    if (siteInfoPopup) siteInfoPopup.classList.remove('open');
    if (capturePopup) capturePopup.classList.remove('open');
    closeFindInPage();
    hideWaybackBar();
    closeSuggestions();
    urlInput.blur();
  }
}

window.addEventListener('keydown', handleBrowserShortcut);

if (window.braveAPI && window.braveAPI.onWebviewShortcut) {
  window.braveAPI.onWebviewShortcut((data) => {
    handleBrowserShortcut(data);
  });
}

// ==========================================
// 13. CONTROLES DE VENTANA NATIVA (Frameless Titlebar)
// Nota: Inicializados en initWindowControls() al inicio del archivo para disponibilidad inmediata.
// ==========================================

function showGlobalToast(text) {
  const toast = document.getElementById('app-toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

// ==========================================
// 14. BRAVE PLAYLIST (brave://playlist)
// ==========================================
const btnPlaylist = document.getElementById('btn-playlist');
if (btnPlaylist) {
  btnPlaylist.addEventListener('click', () => {
    const tab = getActiveTab();
    if (!tab) return;
    if (tab.url.includes('playlist.html') || tab.url === 'brave://playlist') {
      tab.webviewEl.reload();
      return;
    }
    // Si la pestaña tiene contenido válido, guardarla en Playlist sin interrumpir
    if (!tab.url.startsWith('file:') && !tab.url.startsWith('about:')) {
      try {
        const items = JSON.parse(localStorage.getItem('brave_playlist_items') || '[]');
        const exists = items.some((it) => it.url === tab.url);
        if (!exists) {
          items.unshift({
            id: Date.now(),
            title: tab.title || tab.url,
            url: tab.url,
            domain: tab.domain || extractDomain(tab.url) || 'web',
            date: new Date().toLocaleDateString('es-ES'),
          });
          localStorage.setItem('brave_playlist_items', JSON.stringify(items));
          showGlobalToast('✓ Añadido a Brave Playlist');
        } else {
          showGlobalToast('ℹ Ya está guardado en Brave Playlist');
        }
      } catch {}
    } else {
      createTab(playlistUrl);
    }
  });
}

// ==========================================
// 15. PANTALLA DIVIDIDA (Split View)
// ==========================================
let isSplitViewActive = false;
let splitSecondTabId = null;
let splitRatio = 0.5;
const btnSplitView = document.getElementById('btn-split-view');

function ensureSplitResizer() {
  let resizer = document.getElementById('split-resizer');
  if (!resizer) {
    resizer = document.createElement('div');
    resizer.id = 'split-resizer';
    resizer.className = 'split-resizer';
    browserContent.appendChild(resizer);

    // Doble clic para restablecer la proporción al 50% / 50%
    resizer.addEventListener('dblclick', () => {
      splitRatio = 0.5;
      updateSplitViewLayout();
      showGlobalToast('🦁 Pantalla dividida restablecida al 50%');
    });

    let isDragging = false;
    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      resizer.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      // Deshabilitar pointer-events en webviews para evitar que bloqueen el arrastre
      document.querySelectorAll('.webview-instance').forEach((w) => {
        w.style.pointerEvents = 'none';
      });

      const onMouseMove = (ev) => {
        if (!isDragging) return;
        const rect = browserContent.getBoundingClientRect();
        const offsetX = ev.clientX - rect.left;
        let ratio = offsetX / rect.width;
        if (ratio < 0.2) ratio = 0.2;
        if (ratio > 0.8) ratio = 0.8;
        splitRatio = ratio;
        updateSplitViewLayout();
      };

      const onMouseUp = () => {
        isDragging = false;
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.querySelectorAll('.webview-instance').forEach((w) => {
          w.style.pointerEvents = 'auto';
        });
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }
  return resizer;
}

function updateSplitViewLayout() {
  if (!isSplitViewActive) return;
  const resizer = ensureSplitResizer();

  const leftTab = getActiveTab();
  let rightTab = tabs.find((t) => t.id === splitSecondTabId);

  // Si el usuario enfoca la pestaña derecha, se mantiene el split con otra pestaña
  if (!rightTab || (leftTab && rightTab.id === leftTab.id)) {
    rightTab = tabs.find((t) => t.id !== leftTab.id);
  }

  if (!leftTab || !rightTab || leftTab.id === rightTab.id) {
    toggleSplitView();
    return;
  }
  splitSecondTabId = rightTab.id;

  tabs.forEach((t) => {
    if (t.id === leftTab.id) {
      t.tabEl.classList.add('active');
      t.webviewEl.classList.remove('hidden');
      t.webviewEl.classList.add('split-left');
      t.webviewEl.classList.remove('split-right');
      t.webviewEl.style.position = 'relative';
      t.webviewEl.style.top = '0';
      t.webviewEl.style.left = '0';
      t.webviewEl.style.width = `calc(${splitRatio * 100}% - 2.5px)`;
      t.webviewEl.style.height = '100%';
      t.webviewEl.style.visibility = 'visible';
      t.webviewEl.style.opacity = '1';
      t.webviewEl.style.pointerEvents = 'auto';
      t.webviewEl.style.zIndex = '2';
      resumeTabExecution(t);
    } else if (t.id === rightTab.id) {
      t.tabEl.classList.remove('active');
      t.webviewEl.classList.remove('hidden');
      t.webviewEl.classList.add('split-right');
      t.webviewEl.classList.remove('split-left');
      t.webviewEl.style.position = 'relative';
      t.webviewEl.style.top = '0';
      t.webviewEl.style.left = '0';
      t.webviewEl.style.width = `calc(${(1 - splitRatio) * 100}% - 2.5px)`;
      t.webviewEl.style.height = '100%';
      t.webviewEl.style.visibility = 'visible';
      t.webviewEl.style.opacity = '1';
      t.webviewEl.style.pointerEvents = 'auto';
      t.webviewEl.style.zIndex = '2';
      resumeTabExecution(t);
    } else {
      t.tabEl.classList.remove('active');
      t.webviewEl.classList.add('hidden');
      t.webviewEl.classList.remove('split-left', 'split-right');
      t.webviewEl.style.visibility = 'hidden';
      t.webviewEl.style.opacity = '0';
      t.webviewEl.style.pointerEvents = 'none';
      t.webviewEl.style.zIndex = '0';
      t.webviewEl.style.top = '-99999px';
      t.webviewEl.style.left = '-99999px';
      throttleBackgroundTab(t);
    }
  });

  if (leftTab.webviewEl && resizer) {
    leftTab.webviewEl.after(resizer);
  }
}

function toggleSplitView(targetSecondTabId) {
  if (isSplitViewActive) {
    isSplitViewActive = false;
    splitSecondTabId = null;
    browserContent.classList.remove('split-active');
    if (btnSplitView) btnSplitView.classList.remove('active');
    const resizer = document.getElementById('split-resizer');
    if (resizer) resizer.remove();
    tabs.forEach((t) => {
      t.webviewEl.classList.remove('split-left', 'split-right');
      t.webviewEl.style.position = 'absolute';
      t.webviewEl.style.top = '0';
      t.webviewEl.style.left = '0';
      t.webviewEl.style.width = '100%';
      t.webviewEl.style.height = '100%';
      t.webviewEl.style.zIndex = '';
      t.webviewEl.style.pointerEvents = '';
    });
    switchTab(activeTabId);
  } else {
    if (tabs.length < 2) {
      createTab(ntpUrl);
    }
    const second = targetSecondTabId
      ? tabs.find((t) => t.id === targetSecondTabId)
      : tabs.find((t) => t.id !== activeTabId);

    if (!second) return;
    splitSecondTabId = second.id;
    isSplitViewActive = true;
    browserContent.classList.add('split-active');
    if (btnSplitView) btnSplitView.classList.add('active');
    updateSplitViewLayout();
  }
}

if (btnSplitView) {
  btnSplitView.addEventListener('click', () => toggleSplitView());
}

// ==========================================
// 16. MODO OSCURO FORZADO (Force Dark Mode)
// ==========================================
let isForceDarkEnabled = false;
const btnForceDark = document.getElementById('btn-force-dark');

const DARK_CSS = `
  html {
    filter: invert(90%) hue-rotate(180deg) !important;
    background-color: #121212 !important;
  }
  img, video, canvas, svg, [style*="background-image"] {
    filter: invert(100%) hue-rotate(180deg) !important;
  }
`;

function applyForceDarkToTab(tabData, enabled) {
  if (!tabData || !tabData.webviewEl) return;
  if (enabled) {
    tabData.webviewEl.insertCSS(DARK_CSS).then((key) => {
      tabData.darkCssKey = key;
    }).catch(() => {});
  } else if (tabData.darkCssKey) {
    tabData.webviewEl.removeInsertedCSS(tabData.darkCssKey).catch(() => {});
    tabData.darkCssKey = null;
  }
}

function toggleForceDarkMode() {
  isForceDarkEnabled = !isForceDarkEnabled;
  if (btnForceDark) btnForceDark.classList.toggle('active', isForceDarkEnabled);
  tabs.forEach((t) => {
    applyForceDarkToTab(t, isForceDarkEnabled);
  });
  showGlobalToast(`Modo Oscuro Forzado: ${isForceDarkEnabled ? 'Activado' : 'Desactivado'}`);
}

if (btnForceDark) {
  btnForceDark.addEventListener('click', toggleForceDarkMode);
}

// ==========================================
// 17. BUSCADOR RÁPIDO DE PESTAÑAS (Tab Search)
// ==========================================
const tabSearchPopup = document.getElementById('tab-search-popup');
const tabSearchInput = document.getElementById('tab-search-input');
const tabSearchOpenList = document.getElementById('tab-search-open-list');
const tabSearchClosedList = document.getElementById('tab-search-closed-list');

function toggleTabSearch() {
  if (!tabSearchPopup) return;
  const isOpen = tabSearchPopup.classList.toggle('open');
  if (isOpen) {
    if (shieldsPopup) shieldsPopup.classList.remove('open');
    if (mainMenu) mainMenu.classList.remove('open');
    if (globalMediaPopup) globalMediaPopup.classList.remove('open');
    if (profilePopup) profilePopup.classList.remove('open');
    if (tabSearchInput) {
      tabSearchInput.value = '';
      tabSearchInput.focus();
    }
    renderTabSearchResults('');
  }
}

function renderTabSearchResults(filterText = '') {
  if (!tabSearchOpenList || !tabSearchClosedList) return;
  const q = filterText.trim().toLowerCase();

  // 1. Pestañas abiertas
  tabSearchOpenList.innerHTML = '';
  const filteredOpen = tabs.filter(
    (t) => !q || (t.title && t.title.toLowerCase().includes(q)) || (t.url && t.url.toLowerCase().includes(q))
  );
  if (filteredOpen.length === 0) {
    tabSearchOpenList.innerHTML =
      '<div style="font-size: 11.5px; color: var(--text-muted); padding: 8px 14px;">No se encontraron pestañas abiertas</div>';
  } else {
    filteredOpen.forEach((t) => {
      const item = document.createElement('div');
      item.className = 'tab-search-item' + (t.id === activeTabId ? ' active' : '');
      item.innerHTML = `
        <span class="tab-search-icon">${t.isAudible ? '🔊' : '<img src="logo.png" width="14" height="14" style="vertical-align:middle;object-fit:contain;">'}</span>
        <div class="tab-search-details">
          <span class="tab-search-title">${t.title || 'Nueva pestaña'}</span>
          <span class="tab-search-domain">${t.domain || t.url}</span>
        </div>
        <button class="tab-search-close-btn" title="Cerrar pestaña">✕</button>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-search-close-btn')) {
          e.stopPropagation();
          closeTab(t.id);
          renderTabSearchResults(tabSearchInput.value);
        } else {
          switchTab(t.id);
          tabSearchPopup.classList.remove('open');
        }
      });
      tabSearchOpenList.appendChild(item);
    });
  }

  // 2. Pestañas cerradas recientemente
  tabSearchClosedList.innerHTML = '';
  const filteredClosed = closedTabsStack.filter(
    (c) => !q || (c.title && c.title.toLowerCase().includes(q)) || (c.url && c.url.toLowerCase().includes(q))
  );
  if (filteredClosed.length === 0) {
    tabSearchClosedList.innerHTML =
      '<div style="font-size: 11.5px; color: var(--text-muted); padding: 8px 14px;">No hay pestañas cerradas recientemente</div>';
  } else {
    filteredClosed
      .slice(-6)
      .reverse()
      .forEach((c) => {
        const item = document.createElement('div');
        item.className = 'tab-search-item';
        item.innerHTML = `
        <span class="tab-search-icon">🕒</span>
        <div class="tab-search-details">
          <span class="tab-search-title">${c.title || c.url}</span>
          <span class="tab-search-domain">${c.url}</span>
        </div>
      `;
        item.addEventListener('click', () => {
          createTab(c.url);
          const realIdx = closedTabsStack.lastIndexOf(c);
          if (realIdx !== -1) closedTabsStack.splice(realIdx, 1);
          tabSearchPopup.classList.remove('open');
        });
        tabSearchClosedList.appendChild(item);
      });
  }
}

if (tabSearchBtn) {
  tabSearchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTabSearch();
  });
}

let selectedSearchIndex = 0;

function updateSelectedSearchItem(items) {
  items.forEach((it, idx) => {
    if (idx === selectedSearchIndex) {
      it.style.backgroundColor = 'rgba(251, 84, 43, 0.2)';
      it.style.outline = '1px solid var(--brave-orange)';
      it.scrollIntoView({ block: 'nearest' });
    } else {
      it.style.backgroundColor = '';
      it.style.outline = '';
    }
  });
}

if (tabSearchInput) {
  tabSearchInput.addEventListener('input', () => {
    selectedSearchIndex = 0;
    renderTabSearchResults(tabSearchInput.value);
  });

  tabSearchInput.addEventListener('keydown', (e) => {
    const items = tabSearchPopup.querySelectorAll('.tab-search-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedSearchIndex = (selectedSearchIndex + 1) % items.length;
      updateSelectedSearchItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedSearchIndex = (selectedSearchIndex - 1 + items.length) % items.length;
      updateSelectedSearchItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedSearchIndex]) {
        items[selectedSearchIndex].click();
      }
    }
  });
}

// ==========================================
// 18. ADMINISTRADOR DE TAREAS (Shift + Esc)
// ==========================================
const taskManagerModal = document.getElementById('task-manager-modal');
const btnCloseTaskManager = document.getElementById('btn-close-task-manager');
const taskManagerTbody = document.getElementById('task-manager-tbody');
const taskManagerTotalRam = document.getElementById('task-manager-total-ram');
const btnTaskEndProcess = document.getElementById('btn-task-end-process');
let selectedTaskTabId = null;

function openTaskManager() {
  if (!taskManagerModal || !taskManagerTbody) return;
  selectedTaskTabId = null;
  if (btnTaskEndProcess) btnTaskEndProcess.disabled = true;
  renderTaskManagerRows();
  taskManagerModal.classList.add('open');
}

function closeTaskManager() {
  if (taskManagerModal) taskManagerModal.classList.remove('open');
}

function renderTaskManagerRows() {
  if (!taskManagerTbody) return;
  taskManagerTbody.innerHTML = '';
  let totalMem = 0;

  tabs.forEach((t) => {
    totalMem += t.estimatedMemoryMB;
    const tr = document.createElement('tr');
    if (t.id === selectedTaskTabId) tr.classList.add('selected');

    const cpuEst = t.isAudible ? '2.1%' : t.id === activeTabId ? '0.8%' : '0.1%';
    tr.innerHTML = `
      <td>
        <div class="task-cell-title">
          <span>${t.isAudible ? '🔊' : '<img src="logo.png" width="14" height="14" style="vertical-align:middle;object-fit:contain;">'}</span>
          <span style="font-weight: 600;">${t.title || 'Nueva pestaña'}</span>
          <span style="color: var(--text-muted); font-size: 11px;">(${t.domain || 'Brave'})</span>
        </div>
      </td>
      <td><span class="task-ram-badge">${t.estimatedMemoryMB} MB</span></td>
      <td><span class="task-cpu-badge">${cpuEst}</span></td>
      <td style="text-align: right;">
        <button class="btn-end-process btn-row-end" data-tab-id="${t.id}">Finalizar</button>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-row-end')) return;
      selectedTaskTabId = t.id;
      if (btnTaskEndProcess) btnTaskEndProcess.disabled = false;
      renderTaskManagerRows();
    });

    tr.querySelector('.btn-row-end').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(t.id);
      renderTaskManagerRows();
    });

    taskManagerTbody.appendChild(tr);
  });

  if (taskManagerTotalRam) {
    taskManagerTotalRam.textContent = `Memoria total usada por pestañas: ~${totalMem} MB (${tabs.length} pestañas)`;
  }
}

if (btnCloseTaskManager) {
  btnCloseTaskManager.addEventListener('click', closeTaskManager);
}
if (btnTaskEndProcess) {
  btnTaskEndProcess.addEventListener('click', () => {
    if (selectedTaskTabId) {
      closeTab(selectedTaskTabId);
      selectedTaskTabId = null;
      btnTaskEndProcess.disabled = true;
      renderTaskManagerRows();
    }
  });
}

// ==========================================
// 19. SELECTOR DE PERFILES DE USUARIO
// ==========================================
const btnProfile = document.getElementById('btn-profile');
const profilePopup = document.getElementById('profile-popup');
const profileCurrentAvatar = document.getElementById('profile-current-avatar');
const profileCurrentName = document.getElementById('profile-current-name');

const PROFILES = {
  personal: { name: 'Perfil Personal', sub: 'Brave Perfil Principal', icon: '👤' },
  work: { name: 'Perfil Trabajo', sub: 'Espacio de trabajo y proyectos', icon: '💼' },
  guest: { name: 'Modo Invitado', sub: 'Sesión temporal sin historial ni datos', icon: '🕶️' },
};

function initProfileSelector() {
  const savedProfile = localStorage.getItem('brave_active_profile') || 'personal';
  setProfile(savedProfile, false);

  if (btnProfile) {
    btnProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shieldsPopup) shieldsPopup.classList.remove('open');
      if (mainMenu) mainMenu.classList.remove('open');
      if (tabSearchPopup) tabSearchPopup.classList.remove('open');
      if (profilePopup) profilePopup.classList.toggle('open');
    });
  }

  document.querySelectorAll('.profile-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      const pKey = opt.getAttribute('data-profile');
      if (pKey) {
        setProfile(pKey, true);
        if (profilePopup) profilePopup.classList.remove('open');
      }
    });
  });
}

function setProfile(profileKey, showNotification = true) {
  const prof = PROFILES[profileKey] || PROFILES.personal;
  localStorage.setItem('brave_active_profile', profileKey);

  if (btnProfile) btnProfile.textContent = prof.icon;
  if (profileCurrentAvatar) profileCurrentAvatar.textContent = prof.icon;
  if (profileCurrentName) profileCurrentName.textContent = prof.name;

  document.querySelectorAll('.profile-option').forEach((opt) => {
    const k = opt.getAttribute('data-profile');
    const check = opt.querySelector('.profile-opt-check');
    if (k === profileKey) {
      opt.classList.add('active');
      if (check) check.textContent = '✓';
    } else {
      opt.classList.remove('active');
      if (check) check.textContent = '';
    }
  });

  if (profileKey === 'guest' && showNotification) {
    if (window.braveAPI && window.braveAPI.openPrivateWindow) {
      window.braveAPI.openPrivateWindow();
    }
  }
}
initProfileSelector();

// ==========================================
// 20. BRAVE TRANSLATE (Traductor Nativo)
// ==========================================
const btnTranslate = document.getElementById('btn-translate');
const translateBar = document.getElementById('translate-bar');
const btnDoTranslate = document.getElementById('btn-do-translate');
const btnRevertTranslate = document.getElementById('btn-revert-translate');
const btnCloseTranslate = document.getElementById('btn-close-translate');
const translateStatusText = document.getElementById('translate-status-text');

if (btnTranslate) {
  btnTranslate.addEventListener('click', () => {
    if (translateBar) {
      translateBar.classList.toggle('active');
      if (btnDoTranslate) btnDoTranslate.style.display = 'inline-block';
      if (btnRevertTranslate) btnRevertTranslate.style.display = 'none';
      if (translateStatusText) translateStatusText.textContent = '¿Traducir esta página al español?';
    }
  });
}

if (btnCloseTranslate) {
  btnCloseTranslate.addEventListener('click', () => {
    if (translateBar) translateBar.classList.remove('active');
  });
}

if (btnDoTranslate) {
  btnDoTranslate.addEventListener('click', () => {
    const tab = getActiveTab();
    if (!tab || !tab.webviewEl) return;

    if (translateStatusText) translateStatusText.textContent = 'Traduciendo página completa al español...';

    // Inyectar traductor inteligente de oraciones, párrafos y elementos clave
    tab.webviewEl
      .executeJavaScript(`
      (() => {
        const phraseMap = [
          [/search the web/gi, 'buscar en la web'],
          [/all rights reserved/gi, 'todos los derechos reservados'],
          [/read more/gi, 'leer más'],
          [/sign in/gi, 'iniciar sesión'],
          [/sign up/gi, 'registrarse'],
          [/log in/gi, 'acceder'],
          [/log out/gi, 'cerrar sesión'],
          [/privacy policy/gi, 'política de privacidad'],
          [/terms of service/gi, 'términos del servicio'],
          [/cookie policy/gi, 'política de cookies'],
          [/about us/gi, 'sobre nosotros'],
          [/contact us/gi, 'contáctanos'],
          [/learn more/gi, 'más información'],
          [/get started/gi, 'comenzar'],
          [/download now/gi, 'descargar ahora'],
          [/subscribe/gi, 'suscribirse'],
          [/share/gi, 'compartir'],
          [/comments/gi, 'comentarios'],
          [/settings/gi, 'configuración'],
          [/help & support/gi, 'ayuda y soporte'],
          [/trending/gi, 'tendencias'],
          [/subscriptions/gi, 'suscripciones'],
          [/library/gi, 'biblioteca'],
          [/history/gi, 'historial'],
          [/watch later/gi, 'ver más tarde'],
          [/liked videos/gi, 'videos que me gustan'],
          [/in this article/gi, 'en este artículo'],
          [/published on/gi, 'publicado el'],
          [/updated on/gi, 'actualizado el'],
          [/written by/gi, 'escrito por']
        ];

        const wordDict = {
          'home': 'inicio', 'news': 'noticias', 'video': 'video', 'videos': 'videos', 'music': 'música',
          'search': 'buscar', 'cancel': 'cancelar', 'save': 'guardar', 'edit': 'editar', 'delete': 'eliminar',
          'overview': 'resumen', 'features': 'funciones', 'pricing': 'precios', 'documentation': 'documentación',
          'community': 'comunidad', 'privacy': 'privacidad', 'terms': 'términos', 'cookies': 'cookies',
          'articles': 'artículos', 'welcome': 'bienvenido', 'loading': 'cargando', 'next': 'siguiente',
          'previous': 'anterior', 'back': 'atrás', 'close': 'cerrar', 'open': 'abrir', 'yes': 'sí', 'no': 'no'
        };

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        let count = 0;
        while ((node = walker.nextNode())) {
          let text = node.nodeValue;
          if (!text || !text.trim() || node.parentElement?.tagName === 'SCRIPT' || node.parentElement?.tagName === 'STYLE') continue;

          for (const [re, rep] of phraseMap) {
            text = text.replace(re, rep);
          }

          // Reemplazo de palabras sueltas manteniendo mayúsculas/minúsculas
          const trimmed = text.trim().toLowerCase();
          if (wordDict[trimmed]) {
            text = wordDict[trimmed];
          }

          node.nodeValue = text;
          count++;
        }
        return count;
      })()
    `)
      .then((count) => {
        if (translateStatusText) translateStatusText.textContent = `Página traducida al español (${count} nodos de texto adaptados)`;
        if (btnDoTranslate) btnDoTranslate.style.display = 'none';
        if (btnRevertTranslate) btnRevertTranslate.style.display = 'inline-block';
        showGlobalToast('🌐 Página traducida al español');
      })
      .catch(() => {
        if (translateStatusText) translateStatusText.textContent = 'No se pudo traducir automáticamente';
      });
  });
}

if (btnRevertTranslate) {
  btnRevertTranslate.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.webviewEl) {
      tab.webviewEl.reload();
      if (translateStatusText) translateStatusText.textContent = '¿Traducir esta página al español?';
      if (btnDoTranslate) btnDoTranslate.style.display = 'inline-block';
      if (btnRevertTranslate) btnRevertTranslate.style.display = 'none';
      showGlobalToast('Versión original restaurada');
    }
  });
}

// ==========================================
// 21. GESTOR DE EXTENSIONES (UI Toolbar & Popup)
// ==========================================
const btnExtensions = document.getElementById('btn-extensions');
const extensionsPopup = document.getElementById('extensions-popup');
const extensionsPopupList = document.getElementById('extensions-popup-list');
const btnGotoExtensions = document.getElementById('btn-goto-extensions');
const btnPopupWebstore = document.getElementById('btn-popup-webstore');

if (btnExtensions) {
  btnExtensions.addEventListener('click', (e) => {
    e.stopPropagation();
    if (shieldsPopup) shieldsPopup.classList.remove('open');
    if (mainMenu) mainMenu.classList.remove('open');
    if (tabSearchPopup) tabSearchPopup.classList.remove('open');
    if (profilePopup) profilePopup.classList.remove('open');
    if (extensionsPopup) {
      const isOpen = extensionsPopup.classList.toggle('open');
      if (isOpen) renderExtensionsPopupList();
    }
  });
}

if (btnGotoExtensions) {
  btnGotoExtensions.addEventListener('click', () => {
    createTab(extensionsUrl);
    if (extensionsPopup) extensionsPopup.classList.remove('open');
  });
}

if (btnPopupWebstore) {
  btnPopupWebstore.addEventListener('click', () => {
    createTab('https://chromewebstore.google.com');
    if (extensionsPopup) extensionsPopup.classList.remove('open');
  });
}

async function renderExtensionsPopupList() {
  if (!extensionsPopupList || !window.braveAPI || !window.braveAPI.listExtensions) return;
  try {
    const data = await window.braveAPI.listExtensions();
    const installed = data.installed || [];

    if (installed.length === 0) {
      extensionsPopupList.innerHTML = `
        <div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 14px 0;">
          No hay extensiones instaladas aún.
        </div>
      `;
      return;
    }

    extensionsPopupList.innerHTML = '';
    installed.forEach((ext) => {
      const item = document.createElement('div');
      item.className = 'popup-ext-item';
      item.innerHTML = `
        <div class="popup-ext-info">
          <span>${ext.icon || '🧩'}</span>
          <span class="popup-ext-name">${ext.name}</span>
        </div>
        <label class="switch switch-sm">
          <input type="checkbox" class="popup-ext-toggle" ${ext.enabled ? 'checked' : ''} data-id="${ext.id}">
          <span class="slider"></span>
        </label>
      `;

      item.querySelector('.popup-ext-toggle').addEventListener('change', async (e) => {
        const checked = e.target.checked;
        await window.braveAPI.toggleExtension(ext.id, checked);
        showGlobalToast(`Extensión "${ext.name}" ${checked ? 'activada' : 'desactivada'}`);
      });

      extensionsPopupList.appendChild(item);
    });
  } catch (err) {
    console.error('Error renderizando popup de extensiones:', err);
  }
}



// ==========================================
// 22. IMAGEN EN IMAGEN (Picture-in-Picture / PiP)
// ==========================================
const btnPip = document.getElementById('btn-pip');
function triggerPictureInPicture() {
  const tab = getActiveTab();
  if (tab && tab.webviewEl) {
    tab.webviewEl.executeJavaScript(`
      (async () => {
        const video = document.querySelector('video');
        if (video) {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            await video.requestPictureInPicture();
          }
        } else {
          alert('No se detectó ningún video en reproducción en esta pestaña.');
        }
      })()
    `).catch(() => {
      showGlobalToast('No se pudo activar Imagen en Imagen.');
    });
  }
}
if (btnPip) btnPip.addEventListener('click', triggerPictureInPicture);

// ==========================================
// 23. BÚSQUEDA INTERNA EN LA PÁGINA (Find in Page - Ctrl + F)
// ==========================================
const findInPageBar = document.getElementById('find-in-page-bar');
const findInPageInput = document.getElementById('find-in-page-input');
const findInPageCount = document.getElementById('find-in-page-count');
const btnFindPrev = document.getElementById('btn-find-prev');
const btnFindNext = document.getElementById('btn-find-next');
const btnFindClose = document.getElementById('btn-find-close');

function toggleFindInPage() {
  if (!findInPageBar) return;
  const isOpen = findInPageBar.classList.toggle('open');
  if (isOpen) {
    findInPageInput.focus();
    findInPageInput.select();
    const text = findInPageInput.value.trim();
    const tab = getActiveTab();
    if (tab && text) {
      tab.webviewEl.findInPage(text, { forward: true, findNext: false });
    }
  } else {
    closeFindInPage();
  }
}

function closeFindInPage() {
  if (!findInPageBar) return;
  findInPageBar.classList.remove('open');
  const tab = getActiveTab();
  if (tab) tab.webviewEl.stopFindInPage('clearSelection');
  if (findInPageCount) findInPageCount.textContent = '0/0';
}

if (findInPageInput) {
  findInPageInput.addEventListener('input', () => {
    const text = findInPageInput.value.trim();
    const tab = getActiveTab();
    if (!tab) return;
    if (text) {
      tab.webviewEl.findInPage(text, { forward: true, findNext: false });
    } else {
      tab.webviewEl.stopFindInPage('clearSelection');
      findInPageCount.textContent = '0/0';
    }
  });

  findInPageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tab = getActiveTab();
      if (!tab) return;
      const text = findInPageInput.value.trim();
      if (text) {
        tab.webviewEl.findInPage(text, { forward: !e.shiftKey, findNext: true });
      }
    } else if (e.key === 'Escape') {
      closeFindInPage();
    }
  });
}

if (btnFindNext) {
  btnFindNext.addEventListener('click', () => {
    const tab = getActiveTab();
    const text = findInPageInput.value.trim();
    if (tab && text) tab.webviewEl.findInPage(text, { forward: true, findNext: true });
  });
}

if (btnFindPrev) {
  btnFindPrev.addEventListener('click', () => {
    const tab = getActiveTab();
    const text = findInPageInput.value.trim();
    if (tab && text) tab.webviewEl.findInPage(text, { forward: false, findNext: true });
  });
}

if (btnFindClose) {
  btnFindClose.addEventListener('click', closeFindInPage);
}

// ==========================================
// 24. RESPALDO WAYBACK MACHINE (Internet Archive 404/500)
// ==========================================
const waybackBar = document.getElementById('wayback-bar');
const btnWaybackCheck = document.getElementById('btn-wayback-check');
const btnWaybackClose = document.getElementById('btn-wayback-close');

function showWaybackBar(targetUrl) {
  if (!waybackBar || !targetUrl || targetUrl.startsWith('file:') || targetUrl.startsWith('about:')) return;
  waybackBar.classList.add('active');
  if (btnWaybackCheck) {
    btnWaybackCheck.onclick = () => {
      const cleanTarget = targetUrl.replace(/^https?:\/\//i, '');
      createTab(`https://web.archive.org/web/*/${cleanTarget}`);
      waybackBar.classList.remove('active');
    };
  }
  if (btnWaybackClose) {
    btnWaybackClose.onclick = () => {
      waybackBar.classList.remove('active');
    };
  }
}

function hideWaybackBar() {
  if (waybackBar) waybackBar.classList.remove('active');
}

// ==========================================
// 25. GENERADOR DE CÓDIGO QR PARA COMPARTIR PÁGINAS
// ==========================================
const btnQrCode = document.getElementById('btn-qr-code');
const qrPopup = document.getElementById('qr-popup');
const qrCodeContainer = document.getElementById('qr-code-container');
const qrUrlDisplay = document.getElementById('qr-url-display');
const btnCloseQr = document.getElementById('btn-close-qr');
const btnQrCopy = document.getElementById('btn-qr-copy');

function renderQRCodeSvg(text, container) {
  if (!container) return;
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 160, 160);

  const N = 25;
  const moduleSize = Math.floor(140 / N);
  const offset = Math.floor((160 - N * moduleSize) / 2);

  const grid = Array.from({ length: N }, () => Array(N).fill(0));

  function drawFinder(r0, c0) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          grid[r0 + r][c0 + c] = 1;
        }
      }
    }
  }
  drawFinder(0, 0);
  drawFinder(0, N - 7);
  drawFinder(N - 7, 0);

  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        grid[N - 7 + r][N - 7 + c] = 1;
      }
    }
  }

  for (let i = 8; i < N - 8; i++) {
    grid[6][i] = (i % 2 === 0) ? 1 : 0;
    grid[i][6] = (i % 2 === 0) ? 1 : 0;
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  let bitIdx = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const inTopLeft = r <= 7 && c <= 7;
      const inTopRight = r <= 7 && c >= N - 8;
      const inBottomLeft = r >= N - 8 && c <= 7;
      const inTiming = r === 6 || c === 6;
      const inAlign = r >= N - 9 && r <= N - 5 && c >= N - 9 && c <= N - 5;
      if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming && !inAlign) {
        const charCode = text.charCodeAt(bitIdx % text.length) || 0;
        const bit = ((hash >> (bitIdx % 31)) ^ (charCode >> (bitIdx % 8))) & 1;
        grid[r][c] = (bit ^ ((r + c) % 2 === 0 ? 1 : 0));
        bitIdx++;
      }
    }
  }

  ctx.fillStyle = '#000000';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c]) {
        ctx.fillRect(offset + c * moduleSize, offset + r * moduleSize, moduleSize, moduleSize);
      }
    }
  }

  container.appendChild(canvas);

  if (navigator.onLine && text.startsWith('http')) {
    const netImg = new Image();
    netImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(text)}`;
    netImg.onload = () => {
      container.innerHTML = '';
      netImg.style.width = '160px';
      netImg.style.height = '160px';
      netImg.style.borderRadius = '4px';
      container.appendChild(netImg);
    };
  }
}

if (btnQrCode) {
  btnQrCode.addEventListener('click', (e) => {
    e.stopPropagation();
    if (shieldsPopup) shieldsPopup.classList.remove('open');
    if (mainMenu) mainMenu.classList.remove('open');
    if (tabSearchPopup) tabSearchPopup.classList.remove('open');
    const tab = getActiveTab();
    const currentUrl = tab ? tab.url : ntpUrl;
    if (qrUrlDisplay) qrUrlDisplay.value = currentUrl;
    renderQRCodeSvg(currentUrl, qrCodeContainer);
    if (qrPopup) qrPopup.classList.toggle('open');
  });
}

if (btnCloseQr) {
  btnCloseQr.addEventListener('click', () => {
    if (qrPopup) qrPopup.classList.remove('open');
  });
}

if (btnQrCopy) {
  btnQrCopy.addEventListener('click', () => {
    const tab = getActiveTab();
    const val = (qrUrlDisplay && qrUrlDisplay.value) || (tab ? tab.url : '');
    if (val) {
      navigator.clipboard.writeText(val).then(() => {
        showGlobalToast('Enlace copiado al portapapeles');
        if (qrPopup) qrPopup.classList.remove('open');
      });
    }
  });
}

// ==========================================
// 26. GESTIÓN DE PESTAÑAS FIJADAS (Startup en sección 35)
// ==========================================

// ==========================================
// 27. CONTROL DE ZOOM PERSISTENTE POR DOMINIO
// ==========================================
const zoomIndicator = document.getElementById('zoom-indicator');
const zoomValue = document.getElementById('zoom-value');
const zoomResetBtn = document.getElementById('zoom-reset-btn');

function getStoredDomainZoom(domain) {
  if (!domain) return 1.0;
  try {
    const raw = localStorage.getItem('brave_domain_zoom');
    if (!raw) return 1.0;
    const map = JSON.parse(raw);
    return typeof map[domain] === 'number' ? map[domain] : 1.0;
  } catch {
    return 1.0;
  }
}

function saveDomainZoom(domain, factor) {
  if (!domain) return;
  try {
    const raw = localStorage.getItem('brave_domain_zoom');
    const map = raw ? JSON.parse(raw) : {};
    if (Math.abs(factor - 1.0) < 0.01) {
      delete map[domain];
    } else {
      map[domain] = factor;
    }
    localStorage.setItem('brave_domain_zoom', JSON.stringify(map));
  } catch {}
}

function updateZoomUI(factor) {
  if (!zoomIndicator || !zoomValue) return;
  const pct = Math.round(factor * 100);
  if (pct === 100) {
    zoomIndicator.style.display = 'none';
  } else {
    zoomIndicator.style.display = 'inline-flex';
    zoomValue.textContent = `${pct}%`;
  }
}

function applyCurrentTabZoom(newFactor, persist = true) {
  const tab = getActiveTab();
  if (!tab || !tab.webviewEl) return;
  const factor = Math.min(3.0, Math.max(0.3, Math.round(newFactor * 10) / 10));
  try {
    if (typeof tab.webviewEl.setZoomFactor === 'function') {
      tab.webviewEl.setZoomFactor(factor);
    }
  } catch {}
  tab.zoomFactor = factor;
  updateZoomUI(factor);
  const dom = tab.domain || extractDomain(tab.url);
  if (persist && dom) {
    saveDomainZoom(dom, factor);
  }
}

if (zoomIndicator) {
  zoomIndicator.addEventListener('click', () => {
    applyCurrentTabZoom(1.0, true);
  });
}

// ==========================================
// 28. INFORMACIÓN DEL SITIO Y PERMISOS GRANULARES (CANDADO)
// ==========================================
const siteInfoPopup = document.getElementById('site-info-popup');
const siteInfoDomain = document.getElementById('site-info-domain');
const siteInfoSecurity = document.getElementById('site-info-security');
const siteInfoClose = document.getElementById('site-info-close');
const sitePermissionsList = document.getElementById('site-permissions-list');
const siteInfoBtnReset = document.getElementById('site-info-btn-reset');
const siteInfoBtnSettings = document.getElementById('site-info-btn-settings');
const siteInfoDesc = document.getElementById('site-info-desc');

const PERMISSION_CONFIGS = [
  { key: 'camera', label: 'Cámara', icon: '📷' },
  { key: 'microphone', label: 'Micrófono', icon: '🎤' },
  { key: 'notifications', label: 'Notificaciones', icon: '🔔' },
  { key: 'geolocation', label: 'Ubicación', icon: '📍' },
  { key: 'clipboard', label: 'Portapapeles', icon: '📋' },
  { key: 'javascript', label: 'JavaScript', icon: '⚡' },
];

function getDomainPermissions(domain) {
  if (!domain) return {};
  try {
    const raw = localStorage.getItem(`brave_perms_${domain}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDomainPermission(domain, permKey, value) {
  if (!domain) return;
  try {
    const perms = getDomainPermissions(domain);
    if (value === 'default') {
      delete perms[permKey];
    } else {
      perms[permKey] = value;
    }
    localStorage.setItem(`brave_perms_${domain}`, JSON.stringify(perms));
    if (window.braveAPI && window.braveAPI.setSitePermission) {
      window.braveAPI.setSitePermission(domain, permKey, value === 'default' ? 'reset' : value);
    }
    if (permKey === 'javascript' && window.braveAPI && window.braveAPI.toggleScripts) {
      window.braveAPI.toggleScripts(domain);
    }
  } catch {}
}

function renderSitePermissions(domain, url) {
  if (!sitePermissionsList) return;
  sitePermissionsList.innerHTML = '';

  const isHttps = url && url.startsWith('https://');
  const isInternal = !url || url.startsWith('file:') || url.startsWith('brave:');

  if (siteInfoDomain) siteInfoDomain.textContent = isInternal ? 'Brave Interno' : (domain || 'Página local');
  if (siteInfoSecurity) {
    if (isHttps) {
      siteInfoSecurity.textContent = 'La conexión es segura';
      siteInfoSecurity.style.color = '#4ade80';
      if (siteInfoDesc) siteInfoDesc.textContent = 'Tus datos (como contraseñas o tarjetas) permanecen cifrados de extremo a extremo con HTTPS.';
    } else if (isInternal) {
      siteInfoSecurity.textContent = 'Página interna protegida de Brave';
      siteInfoSecurity.style.color = '#38bdf8';
      if (siteInfoDesc) siteInfoDesc.textContent = 'Este recurso se ejecuta de forma local y segura dentro del entorno aislado del navegador.';
    } else {
      siteInfoSecurity.textContent = 'La conexión no es segura (HTTP)';
      siteInfoSecurity.style.color = '#fb542b';
      if (siteInfoDesc) siteInfoDesc.textContent = 'No debes introducir contraseñas o datos confidenciales en este sitio web.';
    }
  }

  const saved = getDomainPermissions(domain);

  PERMISSION_CONFIGS.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'site-perm-item';

    const lbl = document.createElement('span');
    lbl.className = 'site-perm-label';
    lbl.innerHTML = `<span>${p.icon}</span> <span>${p.label}</span>`;

    const select = document.createElement('select');
    select.className = 'site-perm-select';

    const optDefault = document.createElement('option');
    optDefault.value = 'default';
    optDefault.textContent = 'Preguntar (Predeterminado)';

    const optAllow = document.createElement('option');
    optAllow.value = 'allow';
    optAllow.textContent = 'Permitir';

    const optBlock = document.createElement('option');
    optBlock.value = 'block';
    optBlock.textContent = 'Bloquear';

    select.appendChild(optDefault);
    select.appendChild(optAllow);
    select.appendChild(optBlock);

    select.value = saved[p.key] || 'default';

    select.addEventListener('change', () => {
      saveDomainPermission(domain, p.key, select.value);
      showGlobalToast(`Permiso "${p.label}" actualizado para ${domain}`);
    });

    row.appendChild(lbl);
    row.appendChild(select);
    sitePermissionsList.appendChild(row);
  });
}

if (lockIcon) {
  lockIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    if (shieldsPopup) shieldsPopup.classList.remove('open');
    if (mainMenu) mainMenu.classList.remove('open');
    const tab = getActiveTab();
    if (!tab) return;
    const domain = tab.domain || extractDomain(tab.url);
    renderSitePermissions(domain, tab.url);
    if (siteInfoPopup) siteInfoPopup.classList.toggle('open');
  });
}

if (siteInfoClose) {
  siteInfoClose.addEventListener('click', () => {
    if (siteInfoPopup) siteInfoPopup.classList.remove('open');
  });
}

if (siteInfoBtnReset) {
  siteInfoBtnReset.addEventListener('click', () => {
    const tab = getActiveTab();
    if (!tab) return;
    const domain = tab.domain || extractDomain(tab.url);
    localStorage.removeItem(`brave_perms_${domain}`);
    PERMISSION_CONFIGS.forEach((p) => {
      if (window.braveAPI && window.braveAPI.setSitePermission) {
        window.braveAPI.setSitePermission(domain, p.key, 'reset');
      }
    });
    renderSitePermissions(domain, tab.url);
    showGlobalToast(`Permisos restablecidos para ${domain}`);
  });
}

if (siteInfoBtnSettings) {
  siteInfoBtnSettings.addEventListener('click', () => {
    if (siteInfoPopup) siteInfoPopup.classList.remove('open');
    createTab(settingsUrl);
  });
}

const siteInfoBtnClearCookies = document.getElementById('site-info-btn-clear-cookies');
if (siteInfoBtnClearCookies) {
  siteInfoBtnClearCookies.addEventListener('click', async () => {
    const tab = getActiveTab();
    if (!tab) return;
    const domain = tab.domain || extractDomain(tab.url);
    if (window.braveAPI && window.braveAPI.clearDomainData) {
      await window.braveAPI.clearDomainData(domain);
      showGlobalToast(`Cookies y datos borrados para ${domain}`);
      if (tab.webviewEl) tab.webviewEl.reload();
      if (siteInfoPopup) siteInfoPopup.classList.remove('open');
    }
  });
}

// ==========================================
// 29. CAPTURA DE PANTALLA WEB (BRAVE WEB CAPTURE)
// ==========================================
const btnScreenshot = document.getElementById('btn-screenshot');
const capturePopup = document.getElementById('capture-popup');
const btnCloseCapture = document.getElementById('btn-close-capture');
const capturePreviewImg = document.getElementById('capture-preview-img');
const btnCaptureCopy = document.getElementById('btn-capture-copy');
const btnCaptureSave = document.getElementById('btn-capture-save');

let currentCaptureDataUrl = '';

async function captureActivePage() {
  const tab = getActiveTab();
  if (!tab || !tab.webviewEl) return;
  try {
    showGlobalToast('Capturando pantalla de la página web...');
    const image = await tab.webviewEl.capturePage();
    if (!image || image.isEmpty()) {
      showGlobalToast('No se pudo capturar la página activa.');
      return;
    }
    currentCaptureDataUrl = image.toDataURL();
    if (capturePreviewImg) {
      capturePreviewImg.src = currentCaptureDataUrl;
    }
    if (capturePopup) {
      capturePopup.classList.add('open');
    }
  } catch (err) {
    showGlobalToast('Error al realizar la captura.');
  }
}

if (btnScreenshot) {
  btnScreenshot.addEventListener('click', captureActivePage);
}
if (btnCloseCapture) {
  btnCloseCapture.addEventListener('click', () => {
    if (capturePopup) capturePopup.classList.remove('open');
  });
}

if (btnCaptureCopy) {
  btnCaptureCopy.addEventListener('click', async () => {
    if (!currentCaptureDataUrl) return;
    try {
      const res = await fetch(currentCaptureDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showGlobalToast('¡Captura copiada al portapapeles!');
      if (capturePopup) capturePopup.classList.remove('open');
    } catch {
      showGlobalToast('No se pudo copiar al portapapeles.');
    }
  });
}

if (btnCaptureSave) {
  btnCaptureSave.addEventListener('click', async () => {
    if (!currentCaptureDataUrl) return;
    try {
      const base64Data = currentCaptureDataUrl.replace(/^data:image\/png;base64,/, '');
      const tab = getActiveTab();
      const domain = tab?.domain || 'captura-brave';
      const defaultFilename = `brave-${domain}-${Date.now()}.png`;

      if (window.braveAPI && window.braveAPI.showSaveDialog && window.braveAPI.writeFile) {
        const result = await window.braveAPI.showSaveDialog({
          title: 'Guardar captura de pantalla web',
          defaultPath: defaultFilename,
          filters: [{ name: 'Imágenes PNG', extensions: ['png'] }],
        });
        if (!result.canceled && result.filePath) {
          await window.braveAPI.writeFile(result.filePath, base64Data);
          showGlobalToast(`Captura guardada en: ${result.filePath}`);
          if (capturePopup) capturePopup.classList.remove('open');
          return;
        }
      }
      const a = document.createElement('a');
      a.href = currentCaptureDataUrl;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showGlobalToast('Captura descargada correctamente.');
      if (capturePopup) capturePopup.classList.remove('open');
    } catch {
      showGlobalToast('Error al guardar la captura.');
    }
  });
}

// ==========================================
// 30. IMPRESIÓN NATIVA Y GUARDAR COMO PDF (Ctrl + P)
// ==========================================
function printActivePage() {
  const tab = getActiveTab();
  if (!tab || !tab.webviewEl) return;
  try {
    tab.webviewEl.print();
  } catch {
    showGlobalToast('Error al abrir el diálogo de impresión.');
  }
}

// Cerrar popups al hacer clic fuera
document.addEventListener('click', (e) => {
  if (siteInfoPopup && siteInfoPopup.classList.contains('open')) {
    if (!siteInfoPopup.contains(e.target) && e.target !== lockIcon && !lockIcon.contains(e.target)) {
      siteInfoPopup.classList.remove('open');
    }
  }
});

// ==========================================
// 31. RESTAURACIÓN DE SESIÓN ("Continuar donde lo dejaste")
// ==========================================
function saveCurrentSession() {
  // Nunca guardar la sesión si la ventana es Privada o Tor
  if (isCurrentWindowPrivate()) return;
  try {
    const sessionList = tabs.map((t) => ({
      url: t.url || ntpUrl,
      title: t.title || 'Nueva Pestaña',
      isPinned: !!t.isPinned,
    }));
    localStorage.setItem('brave_last_session', JSON.stringify(sessionList));
  } catch {}
}

window.addEventListener('beforeunload', () => {
  saveCurrentSession();
});

window.addEventListener('pagehide', () => {
  saveCurrentSession();
});

// ==========================================
// 32. GESTOR DE CONTRASEÑAS Y AUTOCOMPLETADO
// ==========================================
const passwordSavePopup = document.getElementById('password-save-popup');
const pwPopupDomain = document.getElementById('pw-popup-domain');
const pwInputUsername = document.getElementById('pw-input-username');
const pwInputPassword = document.getElementById('pw-input-password');
const btnClosePwPopup = document.getElementById('btn-close-pw-popup');
const btnPwToggleVis = document.getElementById('btn-pw-toggle-vis');
const btnPwNever = document.getElementById('btn-pw-never');
const btnPwNotNow = document.getElementById('btn-pw-notnow');
const btnPwSave = document.getElementById('btn-pw-save');

let pendingPasswordDomain = '';

function promptSavePassword(tab, username, password) {
  // Nunca solicitar guardar contraseñas en ventana privada o Tor
  if (isCurrentWindowPrivate()) return;
  if (!tab || !tab.domain || tab.domain === 'nueva pestaña' || tab.domain === 'configuración') return;
  const neverList = JSON.parse(localStorage.getItem('brave_passwords_never') || '[]');
  if (neverList.includes(tab.domain.toLowerCase())) return;

  pendingPasswordDomain = tab.domain.toLowerCase();
  if (pwPopupDomain) pwPopupDomain.textContent = tab.domain;
  if (pwInputUsername) pwInputUsername.value = username || '';
  if (pwInputPassword) {
    pwInputPassword.value = password || '';
    pwInputPassword.type = 'password';
  }
  if (passwordSavePopup) passwordSavePopup.classList.add('open');
}

if (btnClosePwPopup) {
  btnClosePwPopup.addEventListener('click', () => {
    if (passwordSavePopup) passwordSavePopup.classList.remove('open');
  });
}
if (btnPwNotNow) {
  btnPwNotNow.addEventListener('click', () => {
    if (passwordSavePopup) passwordSavePopup.classList.remove('open');
  });
}
if (btnPwToggleVis && pwInputPassword) {
  btnPwToggleVis.addEventListener('click', () => {
    if (pwInputPassword.type === 'password') {
      pwInputPassword.type = 'text';
      btnPwToggleVis.textContent = '🔒';
    } else {
      pwInputPassword.type = 'password';
      btnPwToggleVis.textContent = '👁️';
    }
  });
}
if (btnPwNever) {
  btnPwNever.addEventListener('click', () => {
    if (pendingPasswordDomain) {
      const neverList = JSON.parse(localStorage.getItem('brave_passwords_never') || '[]');
      if (!neverList.includes(pendingPasswordDomain)) {
        neverList.push(pendingPasswordDomain);
        localStorage.setItem('brave_passwords_never', JSON.stringify(neverList));
      }
    }
    if (passwordSavePopup) passwordSavePopup.classList.remove('open');
    showGlobalToast('No se volverá a preguntar en este sitio.');
  });
}
if (btnPwSave) {
  btnPwSave.addEventListener('click', () => {
    const userVal = pwInputUsername ? pwInputUsername.value.trim() : '';
    const passVal = pwInputPassword ? pwInputPassword.value : '';
    if (!passVal) return;

    try {
      const savedList = JSON.parse(localStorage.getItem('brave_passwords') || '[]');
      const filtered = savedList.filter(
        (p) => !(p.domain === pendingPasswordDomain && p.username === userVal)
      );
      filtered.push({
        id: Date.now().toString(),
        domain: pendingPasswordDomain,
        username: userVal,
        password: passVal,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('brave_passwords', JSON.stringify(filtered));
      showGlobalToast(`🦁 Contraseña guardada para ${pendingPasswordDomain}`);
    } catch {}
    if (passwordSavePopup) passwordSavePopup.classList.remove('open');
  });
}

// ==========================================
// 33. LIMPIADOR AVANZADO DE DATOS (Clear Data Modal)
// ==========================================
const clearDataModal = document.getElementById('clear-data-modal');
const btnCloseClearData = document.getElementById('btn-close-clear-data');
const btnClearCancel = document.getElementById('btn-clear-cancel');
const btnClearConfirm = document.getElementById('btn-clear-confirm');
const clearTimeRange = document.getElementById('clear-timerange');
const chkClearHistory = document.getElementById('chk-clear-history');
const chkClearCookies = document.getElementById('chk-clear-cookies');
const chkClearCache = document.getElementById('chk-clear-cache');
const chkClearPerms = document.getElementById('chk-clear-perms');

function openClearDataModal() {
  if (mainMenu) mainMenu.classList.remove('open');
  if (clearDataModal) clearDataModal.classList.add('open');
}

function closeClearDataModal() {
  if (clearDataModal) clearDataModal.classList.remove('open');
}

if (btnCloseClearData) btnCloseClearData.addEventListener('click', closeClearDataModal);
if (btnClearCancel) btnClearCancel.addEventListener('click', closeClearDataModal);

if (btnClearConfirm) {
  btnClearConfirm.addEventListener('click', async () => {
    const timeRange = clearTimeRange ? clearTimeRange.value : '24h';
    const dataTypes = [];
    if (chkClearCookies && chkClearCookies.checked) dataTypes.push('cookies', 'storage');
    if (chkClearCache && chkClearCache.checked) dataTypes.push('cache');
    if (chkClearHistory && chkClearHistory.checked) {
      dataTypes.push('history');
      localStorage.removeItem('brave_browser_history');
    }
    if (chkClearPerms && chkClearPerms.checked) {
      localStorage.removeItem('brave_site_permissions');
    }

    btnClearConfirm.disabled = true;
    btnClearConfirm.textContent = 'Borrando...';

    if (window.braveAPI && window.braveAPI.clearBrowsingData) {
      try {
        await window.braveAPI.clearBrowsingData({ timeRange, dataTypes });
        showGlobalToast('🦁 Datos de navegación borrados con éxito');
      } catch {
        showGlobalToast('Error al borrar los datos');
      } finally {
        btnClearConfirm.disabled = false;
        btnClearConfirm.textContent = 'Borrar datos';
        closeClearDataModal();
      }
    } else {
      btnClearConfirm.disabled = false;
      btnClearConfirm.textContent = 'Borrar datos';
      closeClearDataModal();
      showGlobalToast('🦁 Datos de navegación locales borrados');
    }
  });
}

// Menú principal: Borrar datos y Selector de elementos
const menuClearData = document.getElementById('menu-clear-data');
if (menuClearData) {
  menuClearData.addEventListener('click', () => {
    openClearDataModal();
  });
}

const menuElementPicker = document.getElementById('menu-element-picker');
if (menuElementPicker) {
  menuElementPicker.addEventListener('click', () => {
    mainMenu.classList.remove('open');
    activateElementPicker();
  });
}

// ==========================================
// 34. PERSONALIZACIÓN VISUAL (Tema y Color de Acento)
// ==========================================
function applyThemeAndAccent() {
  const theme = localStorage.getItem('brave_theme') || 'dark';
  const accent = localStorage.getItem('brave_accent') || 'orange';

  // Tema Claro / Oscuro / Sistema
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  } else {
    document.body.classList.remove('light-theme');
  }

  // Color de acento
  document.body.setAttribute('data-accent', accent);
}

applyThemeAndAccent();

// Escuchar cambios de sistema operativo o entre ventanas/configuración
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (localStorage.getItem('brave_theme') === 'system') {
    applyThemeAndAccent();
  }
});

window.addEventListener('storage', (e) => {
  if (e.key === 'brave_theme' || e.key === 'brave_accent') {
    applyThemeAndAccent();
  }
});

// ==========================================
// 36. ERGONOMÍA AVANZADA DE RATÓN Y GESTOS
// ==========================================
// Zoom con rueda del ratón (Ctrl + Scroll)
window.addEventListener(
  'wheel',
  (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const tab = getActiveTab();
      if (!tab || !tab.webviewEl) return;
      const current = tab.zoomFactor || 1.0;
      const step = e.deltaY < 0 ? 0.1 : -0.1;
      const nextZoom = Math.min(3.0, Math.max(0.25, Math.round((current + step) * 10) / 10));
      applyCurrentTabZoom(nextZoom, true);
    }
  },
  { passive: false }
);

// Botones laterales del ratón (Mouse 4 = Atrás, Mouse 5 = Adelante)
window.addEventListener('mouseup', (e) => {
  const tab = getActiveTab();
  if (!tab || !tab.webviewEl) return;
  if (e.button === 3) {
    if (tab.webviewEl.canGoBack()) tab.webviewEl.goBack();
  } else if (e.button === 4) {
    if (tab.webviewEl.canGoForward()) tab.webviewEl.goForward();
  }
});

if (window.braveAPI && window.braveAPI.onNavigateBack) {
  window.braveAPI.onNavigateBack(() => {
    const tab = getActiveTab();
    if (tab && tab.webviewEl && tab.webviewEl.canGoBack()) tab.webviewEl.goBack();
  });
}
if (window.braveAPI && window.braveAPI.onNavigateForward) {
  window.braveAPI.onNavigateForward(() => {
    const tab = getActiveTab();
    if (tab && tab.webviewEl && tab.webviewEl.canGoForward()) tab.webviewEl.goForward();
  });
}

// ==========================================
// 37. PIPELINE NATIVO DE DESCARGAS (Downloads)
// ==========================================
const downloadBar = document.getElementById('download-bar');
const downloadFilename = document.getElementById('download-filename');
const downloadMeta = document.getElementById('download-meta');
const downloadProgressFill = document.getElementById('download-progress-fill');
const btnDownloadOpen = document.getElementById('btn-download-open');
const btnDownloadFolder = document.getElementById('btn-download-folder');
const btnDownloadCancel = document.getElementById('btn-download-cancel');
const btnDownloadClose = document.getElementById('btn-download-close');

let currentDownloadPath = '';
let currentDownloadId = '';

if (btnDownloadClose) {
  btnDownloadClose.addEventListener('click', () => {
    if (downloadBar) downloadBar.classList.remove('active');
  });
}

if (btnDownloadCancel) {
  btnDownloadCancel.addEventListener('click', async () => {
    if (currentDownloadId && window.braveAPI && window.braveAPI.cancelDownload) {
      await window.braveAPI.cancelDownload(currentDownloadId);
      if (downloadMeta) downloadMeta.textContent = 'Descarga cancelada';
      btnDownloadCancel.style.display = 'none';
      showGlobalToast('✕ Descarga cancelada');
    }
  });
}

if (btnDownloadOpen) {
  btnDownloadOpen.addEventListener('click', () => {
    if (currentDownloadPath && window.braveAPI && window.braveAPI.openPath) {
      window.braveAPI.openPath(currentDownloadPath);
    }
  });
}

if (btnDownloadFolder) {
  btnDownloadFolder.addEventListener('click', () => {
    if (currentDownloadPath && window.braveAPI && window.braveAPI.showItemInFolder) {
      window.braveAPI.showItemInFolder(currentDownloadPath);
    }
  });
}

const btnDownloadAll = document.getElementById('btn-download-all');
if (btnDownloadAll) {
  btnDownloadAll.addEventListener('click', () => {
    createTab(downloadsUrl);
    if (downloadBar) downloadBar.classList.remove('active');
  });
}

// Soporte para soltar enlaces o texto directamente en la barra de pestañas para abrir
[tabBar, newTabBtn].forEach((el) => {
  if (!el) return;
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!e.dataTransfer) return;
    const raw = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (raw && raw.trim() && !draggedTabId) {
      let url = raw.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        url = getSearchEngineQueryUrl(url);
      }
      createTab(url);
      showGlobalToast('Enlace abierto en nueva pestaña');
    }
  });
});

// Helper: relay download event to any open downloads tab webview
function relayDownloadEvent(eventName, data) {
  try {
    document.querySelectorAll('webview').forEach((wv) => {
      try {
        const src = wv.getAttribute('src') || '';
        if (src.includes('downloads.html')) {
          wv.executeJavaScript(`window.dispatchEvent(new CustomEvent(${JSON.stringify(eventName)}, { detail: ${JSON.stringify(data)} }))`).catch(() => {});
        }
      } catch {}
    });
  } catch {}
}

if (window.braveAPI && window.braveAPI.onDownloadStarted) {
  window.braveAPI.onDownloadStarted((data) => {
    currentDownloadId = data.id;
    currentDownloadPath = data.savePath;
    if (downloadBar) downloadBar.classList.add('active');
    if (downloadFilename) downloadFilename.textContent = data.filename;
    if (downloadMeta) downloadMeta.textContent = 'Iniciando descarga...';
    if (downloadProgressFill) downloadProgressFill.style.width = '5%';
    if (btnDownloadCancel) btnDownloadCancel.style.display = 'inline-block';
    if (btnDownloadOpen) btnDownloadOpen.style.display = 'none';
    if (btnDownloadFolder) btnDownloadFolder.style.display = 'none';
    relayDownloadEvent('dl:started', data);
  });

  window.braveAPI.onDownloadProgress((data) => {
    if (downloadBar && !downloadBar.classList.contains('active')) {
      downloadBar.classList.add('active');
    }
    if (downloadFilename) downloadFilename.textContent = data.filename;
    if (data.totalBytes > 0) {
      const pct = Math.min(100, Math.round((data.receivedBytes / data.totalBytes) * 100));
      if (downloadProgressFill) downloadProgressFill.style.width = pct + '%';
      const recMB = (data.receivedBytes / (1024 * 1024)).toFixed(1);
      const totMB = (data.totalBytes / (1024 * 1024)).toFixed(1);
      if (downloadMeta) downloadMeta.textContent = `${recMB} MB de ${totMB} MB (${pct}%)`;
    } else {
      const recMB = (data.receivedBytes / (1024 * 1024)).toFixed(1);
      if (downloadMeta) downloadMeta.textContent = `${recMB} MB descargados`;
    }
    relayDownloadEvent('dl:progress', data);
  });

  window.braveAPI.onDownloadCompleted((data) => {
    currentDownloadPath = data.savePath;
    if (downloadProgressFill) downloadProgressFill.style.width = '100%';
    if (downloadMeta) downloadMeta.textContent = 'Descarga completada con éxito';
    if (btnDownloadCancel) btnDownloadCancel.style.display = 'none';
    if (btnDownloadOpen) btnDownloadOpen.style.display = 'inline-block';
    if (btnDownloadFolder) btnDownloadFolder.style.display = 'inline-block';

    // Registrar en brave_downloads para brave://downloads
    try {
      const dlList = JSON.parse(localStorage.getItem('brave_downloads') || '[]');
      dlList.unshift({
        id: data.id,
        filename: data.filename,
        savePath: data.savePath,
        totalBytes: data.totalBytes,
        url: data.url || '',
        date: new Date().toISOString(),
        state: 'completed',
      });
      localStorage.setItem('brave_downloads', JSON.stringify(dlList.slice(0, 200)));
    } catch {}

    showGlobalToast(`🦁 Descarga completada: ${data.filename}`);
    relayDownloadEvent('dl:completed', data);
  });

  window.braveAPI.onDownloadFailed((data) => {
    if (btnDownloadCancel) btnDownloadCancel.style.display = 'none';
    if (downloadMeta) downloadMeta.textContent = `Descarga interrumpida (${data.state})`;

    // Registrar descarga fallida en el historial
    try {
      const dlList = JSON.parse(localStorage.getItem('brave_downloads') || '[]');
      dlList.unshift({
        id: data.id,
        filename: data.filename,
        savePath: '',
        totalBytes: 0,
        url: '',
        date: new Date().toISOString(),
        state: data.state || 'interrupted',
      });
      localStorage.setItem('brave_downloads', JSON.stringify(dlList.slice(0, 200)));
    } catch {}

    showGlobalToast(`Error en la descarga de ${data.filename}`);
  });
}

// Controles Multimedia Globales de Hardware (Media Keys / Windows SMTC)
if (window.braveAPI && window.braveAPI.onMediaKey) {
  window.braveAPI.onMediaKey((cmd) => {
    const targetTab = tabs.find((t) => t.isAudible) || getActiveTab();
    if (targetTab && targetTab.webviewEl) {
      targetTab.webviewEl.executeJavaScript(`
        (function() {
          const media = Array.from(document.querySelectorAll('video, audio')).find(m => !m.paused) || document.querySelector('video, audio');
          if (media) {
            if ("${cmd}" === "media-play-pause") {
              if (media.paused) media.play(); else media.pause();
            } else if ("${cmd}" === "media-stop") {
              media.pause();
              media.currentTime = 0;
            } else if ("${cmd}" === "media-next-track") {
              media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
            } else if ("${cmd}" === "media-previous-track") {
              media.currentTime = Math.max(0, media.currentTime - 10);
            }
          }
        })();
      `).catch(() => {});
    }
  });
}

// ==========================================
// 38. AUTENTICACIÓN HTTP BÁSICA (HTTP Auth Modal)
// ==========================================
const authModal = document.getElementById('auth-modal');
const authDesc = document.getElementById('auth-desc');
const authUsernameInput = document.getElementById('auth-username');
const authPasswordInput = document.getElementById('auth-password');
const btnAuthCancel = document.getElementById('btn-auth-cancel');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const btnAuthClose = document.getElementById('btn-auth-close');

let activeAuthId = null;

function closeAuthDialog(cancel = true) {
  if (activeAuthId && window.braveAPI && window.braveAPI.submitAuth) {
    if (cancel) {
      window.braveAPI.submitAuth(activeAuthId, '', '', true);
    } else {
      const u = authUsernameInput ? authUsernameInput.value : '';
      const p = authPasswordInput ? authPasswordInput.value : '';
      window.braveAPI.submitAuth(activeAuthId, u, p, false);
    }
  }
  activeAuthId = null;
  if (authModal) authModal.classList.remove('open');
}

if (btnAuthCancel) btnAuthCancel.addEventListener('click', () => closeAuthDialog(true));
if (btnAuthClose) btnAuthClose.addEventListener('click', () => closeAuthDialog(true));
if (btnAuthSubmit) btnAuthSubmit.addEventListener('click', () => closeAuthDialog(false));

if (authPasswordInput) {
  authPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') closeAuthDialog(false);
  });
}

if (window.braveAPI && window.braveAPI.onAuthRequired) {
  window.braveAPI.onAuthRequired((data) => {
    activeAuthId = data.authId;
    if (authDesc) {
      authDesc.textContent = `El servidor "${data.host}${data.port ? ':' + data.port : ''}" solicita autenticación.${data.realm ? ' Mensaje: ' + data.realm : ''}`;
    }
    if (authUsernameInput) authUsernameInput.value = '';
    if (authPasswordInput) authPasswordInput.value = '';
    if (authModal) authModal.classList.add('open');
    if (authUsernameInput) authUsernameInput.focus();
  });
}

// ==========================================
// 39. RESILIENCIA ANTE CAÍDAS DE PESTAÑA (Crash Recovery)
// ==========================================
const tabCrashBanner = document.getElementById('tab-crash-banner');
const crashBannerText = document.getElementById('crash-banner-text');
const btnCrashReload = document.getElementById('btn-crash-reload');
const btnCrashClose = document.getElementById('btn-crash-close');

if (btnCrashClose) {
  btnCrashClose.addEventListener('click', () => {
    if (tabCrashBanner) tabCrashBanner.classList.remove('active');
  });
}

if (btnCrashReload) {
  btnCrashReload.addEventListener('click', () => {
    if (tabCrashBanner) tabCrashBanner.classList.remove('active');
    const tab = getActiveTab();
    if (tab && tab.webviewEl) tab.webviewEl.reload();
  });
}

if (window.braveAPI && window.braveAPI.onTabCrashed) {
  window.braveAPI.onTabCrashed((data) => {
    if (crashBannerText) {
      crashBannerText.textContent = `¡Vaya! Se ha producido un error al mostrar esta página web (Motivo: ${data.reason || 'cierre inesperado'}).`;
    }
    if (tabCrashBanner) tabCrashBanner.classList.add('active');
  });
}

// ==========================================
// 35. RESTAURACIÓN Y PUESTA EN MARCHA (Startup)
// ==========================================
// 39. INICIALIZACIÓN DE SESIÓN Y PESTAÑAS (Startup Session)
// ==========================================
const startupMode = localStorage.getItem('brave_startup_mode') || 'continue';
const restoredUrls = new Set();
const initialArgUrl = window.braveAPI && window.braveAPI.getInitialUrl ? window.braveAPI.getInitialUrl() : null;

if (initialArgUrl) {
  createTab(initialArgUrl);
} else {
  // 1. Restaurar pestañas fijadas persistentes (sin duplicados)
  try {
    const savedPinned = JSON.parse(localStorage.getItem('brave_pinned_tabs') || '[]');
    if (Array.isArray(savedPinned)) {
      savedPinned.forEach((p) => {
        if (p.url && !restoredUrls.has(p.url)) {
          createTab(p.url, { pinned: true });
          restoredUrls.add(p.url);
        }
      });
    }
  } catch {}

  // 2. Restaurar sesión previa si el modo es "continue"
  if (startupMode === 'continue' && !isCurrentWindowPrivate()) {
    try {
      const lastSession = JSON.parse(localStorage.getItem('brave_last_session') || '[]');
      if (Array.isArray(lastSession)) {
        lastSession.forEach((savedTab) => {
          if (savedTab.url && !savedTab.url.includes('ntp.html')) {
            if (!restoredUrls.has(savedTab.url)) {
              createTab(savedTab.url, { pinned: !!savedTab.isPinned });
              restoredUrls.add(savedTab.url);
            }
          }
        });
      }
    } catch {}
  }

  // 3. Si no hay pestañas abiertas, abrir la Nueva Pestaña (NTP)
  if (tabs.length === 0) {
    createTab(ntpUrl);
  } else {
    // Enfocar la primera pestaña no fijada o la primera disponible
    const firstNonPinned = tabs.find((t) => !t.isPinned) || tabs[0];
    switchTab(firstNonPinned.id);
  }
}
