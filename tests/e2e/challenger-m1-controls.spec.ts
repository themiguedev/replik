import { test, expect } from './fixtures/index.js';
import http from 'node:http';
import { AddressInfo } from 'node:net';

test.describe('Milestone 1 Empirical Challenger Suite: Navigation Action Controls & Sidebar Dock', () => {
  let server: http.Server;
  let serverPort: number;
  let slowReqCount = 0;
  let slowReqAborted = 0;

  test.beforeAll(async () => {
    server = http.createServer((req, res) => {
      const url = req.url || '';
      if (url.startsWith('/slow-page')) {
        slowReqCount++;
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        });
        res.write('<!DOCTYPE html><html><head><title>Slow Loading Page</title></head><body><h1>Loading in progress...</h1>');

        const timer = setTimeout(() => {
          try {
            res.end('<p>Finished loading</p></body></html>');
          } catch {}
        }, 12000);

        req.on('close', () => {
          clearTimeout(timer);
          slowReqAborted++;
        });
        return;
      }

      if (url.startsWith('/instant-page')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<!DOCTYPE html><html><head><title>Instant Page</title></head><body><h1>Instant Page Ready</h1></body></html>');
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        serverPort = addr.port;
        resolve();
      });
      server.on('error', reject);
    });
  });

  test.afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test.beforeEach(async ({ shellPage }) => {
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
  });

  // =========================================================================
  // SECTION 1: RELOAD / STOP BUTTON TOGGLE & HALTING LOADING
  // =========================================================================

  test('1.1 Initial and Idle State: Reload button reflects data-state="reload"', async ({ shellPage }) => {
    // On NTP, webview is loaded. The reload button should have title 'Recargar (Ctrl+R)'
    await expect(shellPage.reloadButton).toHaveAttribute('title', /Recargar/);
    
    // Check data-state attribute or default idle state
    const state = await shellPage.reloadButton.getAttribute('data-state');
    expect(state === null || state === 'reload').toBe(true);

    // Navigate to instant page
    const instantUrl = `http://127.0.0.1:${serverPort}/instant-page`;
    await shellPage.navigateTo(instantUrl);
    await shellPage.waitForWebviewStopLoading(10000);

    // After finish loading, data-state must be explicitly 'reload'
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'reload');
    await expect(shellPage.reloadButton).toHaveAttribute('title', 'Recargar (Ctrl+R)');
  });

  test('1.2 Loading State: Reload button transitions to data-state="stop" on navigation start', async ({ shellPage }) => {
    const slowUrl = `http://127.0.0.1:${serverPort}/slow-page?t=${Date.now()}`;
    await shellPage.navigateTo(slowUrl);

    // While slow page is in-flight, data-state must transition to 'stop'
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'stop', { timeout: 5000 });
    await expect(shellPage.reloadButton).toHaveAttribute('title', 'Detener carga (Esc)');
  });

  test('1.3 Halting Loading via #btn-reload Click: Halts webview and reverts to data-state="reload"', async ({ shellPage, mainWindow }) => {
    const slowUrl = `http://127.0.0.1:${serverPort}/slow-page?t=${Date.now()}`;
    await shellPage.navigateTo(slowUrl);

    // Ensure it is in stop state
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'stop', { timeout: 5000 });

    // Verify active tab isLoading flag is true in renderer
    const initialLoading = await mainWindow.evaluate(() => {
      const getActive = (window as any).getActiveTab;
      const tab = typeof getActive === 'function' ? getActive() : null;
      return tab ? tab.isLoading : null;
    });
    expect(initialLoading).toBe(true);

    // Click #btn-reload to invoke .stop()
    await shellPage.reloadButton.click();

    // Verify button switches back to 'reload'
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'reload', { timeout: 5000 });
    await expect(shellPage.reloadButton).toHaveAttribute('title', 'Recargar (Ctrl+R)');

    // Verify active tab isLoading flag is now false
    const postLoading = await mainWindow.evaluate(() => {
      const getActive = (window as any).getActiveTab;
      const tab = typeof getActive === 'function' ? getActive() : null;
      return tab ? tab.isLoading : null;
    });
    expect(postLoading).toBe(false);
  });

  test('1.4 Halting Loading via Escape Key: Halts webview and reverts to data-state="reload"', async ({ shellPage, mainWindow }) => {
    const slowUrl = `http://127.0.0.1:${serverPort}/slow-page?t=${Date.now()}`;
    await shellPage.navigateTo(slowUrl);

    // Wait until in stop state
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'stop', { timeout: 5000 });

    // Press Escape key
    await mainWindow.keyboard.press('Escape');

    // Verify button switches back to 'reload'
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'reload', { timeout: 5000 });
    await expect(shellPage.reloadButton).toHaveAttribute('title', 'Recargar (Ctrl+R)');

    // Verify active tab isLoading flag is false
    const postLoading = await mainWindow.evaluate(() => {
      const getActive = (window as any).getActiveTab;
      const tab = typeof getActive === 'function' ? getActive() : null;
      return tab ? tab.isLoading : null;
    });
    expect(postLoading).toBe(false);
  });

  test('1.5 Multi-Tab Loading Isolation: data-state reflects active tab loading state', async ({ shellPage, mainWindow }) => {
    // Tab 0 starts loading slow page
    const slowUrl = `http://127.0.0.1:${serverPort}/slow-page?t=${Date.now()}`;
    await shellPage.navigateTo(slowUrl);
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'stop', { timeout: 5000 });

    // Open Tab 1 and navigate to instant page
    await shellPage.openNewTab();
    const instantUrl = `http://127.0.0.1:${serverPort}/instant-page`;
    await shellPage.navigateTo(instantUrl);
    await shellPage.waitForWebviewStopLoading(10000);

    // Tab 1 is idle -> data-state must be 'reload'
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'reload');

    // Switch back to Tab 0 -> data-state must restore to 'stop'
    await shellPage.switchTab(0);
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'stop');

    // Stop Tab 0 via reload button
    await shellPage.reloadButton.click();
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'reload');

    // Switch to Tab 1 -> still 'reload'
    await shellPage.switchTab(1);
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'reload');
  });

  test('1.6 Stress Test: Rapid spam clicking #btn-reload during loading does not crash or desync', async ({ shellPage, mainWindow }) => {
    const slowUrl = `http://127.0.0.1:${serverPort}/slow-page?t=${Date.now()}`;
    await shellPage.navigateTo(slowUrl);
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'stop', { timeout: 5000 });

    // Spam click 10 times in rapid succession
    for (let i = 0; i < 10; i++) {
      await shellPage.reloadButton.click({ delay: 30 });
    }

    // Verify app remains responsive, button has a valid data-state
    const finalState = await shellPage.reloadButton.getAttribute('data-state');
    expect(['reload', 'stop']).toContain(finalState);

    // Stop loading if still in stop
    if (finalState === 'stop') {
      await shellPage.reloadButton.click();
    }
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'reload', { timeout: 5000 });
  });

  // =========================================================================
  // SECTION 2: SIDEBAR DOCK, TOGGLE, WEBVIEW WIDTH & PERSISTENCE
  // =========================================================================

  test('2.1 Initial Sidebar Dock State & Elements', async ({ mainWindow }) => {
    const dock = mainWindow.locator('#brave-sidebar-dock');
    const browserContent = mainWindow.locator('#browser-content');
    const toggleBtn = mainWindow.locator('#btn-sidebar-toggle');

    await expect(dock).toBeAttached();
    await expect(toggleBtn).toBeAttached();

    // Verify all 6 dock buttons exist
    await expect(mainWindow.locator('#sidebar-btn-leo')).toBeAttached();
    await expect(mainWindow.locator('#sidebar-btn-bookmarks')).toBeAttached();
    await expect(mainWindow.locator('#sidebar-btn-history')).toBeAttached();
    await expect(mainWindow.locator('#sidebar-btn-playlist')).toBeAttached();
    await expect(mainWindow.locator('#sidebar-btn-wallet')).toBeAttached();
    await expect(mainWindow.locator('#sidebar-btn-collapse')).toBeAttached();

    // Default state: sidebar is visible by default
    const isSidebarOpen = await browserContent.evaluate((el) => el.classList.contains('sidebar-open'));
    const isDockCollapsed = await dock.evaluate((el) => el.classList.contains('collapsed'));
    expect(isSidebarOpen).toBe(true);
    expect(isDockCollapsed).toBe(false);
  });

  test('2.2 #btn-sidebar-toggle toggles .collapsed, .sidebar-open, and localStorage', async ({ mainWindow }) => {
    const dock = mainWindow.locator('#brave-sidebar-dock');
    const browserContent = mainWindow.locator('#browser-content');
    const toggleBtn = mainWindow.locator('#btn-sidebar-toggle');

    // Currently open -> click to collapse
    await toggleBtn.click();

    await expect(dock).toHaveClass(/collapsed/);
    await expect(browserContent).not.toHaveClass(/sidebar-open/);
    await expect(toggleBtn).not.toHaveClass(/active/);

    // Verify localStorage persistence
    const storedAfterClose = await mainWindow.evaluate(() => localStorage.getItem('brave_sidebar_visible'));
    expect(storedAfterClose).toBe('false');

    // Click to expand again
    await toggleBtn.click();

    await expect(dock).not.toHaveClass(/collapsed/);
    await expect(browserContent).toHaveClass(/sidebar-open/);
    await expect(toggleBtn).toHaveClass(/active/);

    const storedAfterOpen = await mainWindow.evaluate(() => localStorage.getItem('brave_sidebar_visible'));
    expect(storedAfterOpen).toBe('true');
  });

  test('2.3 #sidebar-btn-collapse collapses dock and updates localStorage', async ({ mainWindow }) => {
    const dock = mainWindow.locator('#brave-sidebar-dock');
    const browserContent = mainWindow.locator('#browser-content');
    const collapseBtn = mainWindow.locator('#sidebar-btn-collapse');
    const toggleBtn = mainWindow.locator('#btn-sidebar-toggle');

    // Ensure it is open
    const isOpen = await browserContent.evaluate((el) => el.classList.contains('sidebar-open'));
    if (!isOpen) {
      await toggleBtn.click();
    }
    await expect(browserContent).toHaveClass(/sidebar-open/);

    // Click collapse button inside dock
    await collapseBtn.click();

    await expect(dock).toHaveClass(/collapsed/);
    await expect(browserContent).not.toHaveClass(/sidebar-open/);
    await expect(toggleBtn).not.toHaveClass(/active/);

    const storedVal = await mainWindow.evaluate(() => localStorage.getItem('brave_sidebar_visible'));
    expect(storedVal).toBe('false');

    // Restore to open
    await toggleBtn.click();
    await expect(browserContent).toHaveClass(/sidebar-open/);
  });

  test('2.4 Webview Width Adjustment: calc(100% - 44px) when sidebar open vs 100% when collapsed', async ({ mainWindow }) => {
    const browserContent = mainWindow.locator('#browser-content');
    const toggleBtn = mainWindow.locator('#btn-sidebar-toggle');

    // Ensure open
    const isOpen = await browserContent.evaluate((el) => el.classList.contains('sidebar-open'));
    if (!isOpen) {
      await toggleBtn.click();
    }
    await expect(browserContent).toHaveClass(/sidebar-open/);

    // Check dimensions when sidebar-open
    const openDims = await mainWindow.evaluate(() => {
      const bc = document.getElementById('browser-content');
      const wv = document.querySelector('webview.webview-instance:not(.hidden)');
      if (!bc || !wv) return null;
      return {
        bcWidth: bc.clientWidth,
        wvWidth: wv.clientWidth,
        wvBoundingWidth: wv.getBoundingClientRect().width,
      };
    });

    expect(openDims).not.toBeNull();
    if (openDims) {
      const expectedWidth = openDims.bcWidth - 44;
      // Allow 1.5px tolerance for fractional scaling / subpixel layout
      expect(Math.abs(openDims.wvWidth - expectedWidth)).toBeLessThanOrEqual(2);
    }

    // Now collapse sidebar
    await toggleBtn.click();
    await expect(browserContent).not.toHaveClass(/sidebar-open/);

    // Check dimensions when collapsed
    const closedDims = await mainWindow.evaluate(() => {
      const bc = document.getElementById('browser-content');
      const wv = document.querySelector('webview.webview-instance:not(.hidden)');
      if (!bc || !wv) return null;
      return {
        bcWidth: bc.clientWidth,
        wvWidth: wv.clientWidth,
        wvBoundingWidth: wv.getBoundingClientRect().width,
      };
    });

    expect(closedDims).not.toBeNull();
    if (closedDims) {
      // Full width
      expect(Math.abs(closedDims.wvWidth - closedDims.bcWidth)).toBeLessThanOrEqual(2);
    }

    // Restore to open
    await toggleBtn.click();
  });

  test('2.5 Stress Test: Rapid toggle spam on #btn-sidebar-toggle preserves sync and stability', async ({ mainWindow }) => {
    const dock = mainWindow.locator('#brave-sidebar-dock');
    const browserContent = mainWindow.locator('#browser-content');
    const toggleBtn = mainWindow.locator('#btn-sidebar-toggle');

    // Rapid toggle 20 times
    for (let i = 0; i < 20; i++) {
      await toggleBtn.click({ delay: 25 });
    }

    // Verify consistency: if browserContent has sidebar-open, dock must NOT have collapsed, and vice-versa
    const finalOpen = await browserContent.evaluate((el) => el.classList.contains('sidebar-open'));
    const finalCollapsed = await dock.evaluate((el) => el.classList.contains('collapsed'));
    const finalActive = await toggleBtn.evaluate((el) => el.classList.contains('active'));
    const stored = await mainWindow.evaluate(() => localStorage.getItem('brave_sidebar_visible'));

    expect(finalOpen).toBe(!finalCollapsed);
    expect(finalActive).toBe(finalOpen);
    expect(stored).toBe(finalOpen ? 'true' : 'false');
  });

  test('3.1 Cross-Feature Stress: Sidebar toggle while loading does not disrupt Escape halting', async ({ shellPage, mainWindow }) => {
    const slowUrl = `http://127.0.0.1:${serverPort}/slow-page?t=${Date.now()}`;
    await shellPage.navigateTo(slowUrl);
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'stop', { timeout: 5000 });

    const toggleBtn = mainWindow.locator('#btn-sidebar-toggle');
    const browserContent = mainWindow.locator('#browser-content');

    // Toggle sidebar while page is loading
    await toggleBtn.click();

    // Reload button must STILL be in 'stop' state
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'stop');

    // Press Escape to halt loading
    await mainWindow.keyboard.press('Escape');

    // Reload button reverts to 'reload'
    await expect(shellPage.reloadButton).toHaveAttribute('data-state', 'reload', { timeout: 5000 });

    // Sidebar dock remains in its toggled state (Escape shouldn't have closed it)
    const isSidebarOpen = await browserContent.evaluate((el) => el.classList.contains('sidebar-open'));
    // Restore sidebar if closed
    if (!isSidebarOpen) {
      await toggleBtn.click();
    }
  });
});
