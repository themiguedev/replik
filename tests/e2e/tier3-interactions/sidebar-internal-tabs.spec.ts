import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 3: Sidebar Toggle + Internal Pages + Active Tab Preservation', () => {
  let mockServer: MockTestServer;

  test.beforeAll(async () => {
    mockServer = new MockTestServer(0);
    await mockServer.start();
  });

  test.afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  test.beforeEach(async ({ shellPage }) => {
    mockServer.clearRequestLog();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
  });

  test('3.3.1 Leo Sidebar Toggle Preserves Active Webview DOM and Scroll State', async ({ shellPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // Set scroll position, inject test input, and set custom JavaScript marker in active webview
    await shellPage.executeInActiveWebview(`
      document.body.style.minHeight = '3000px';
      const input = document.createElement('input');
      input.id = 'test-input-preserve';
      input.value = 'brave-preserved-data';
      document.body.appendChild(input);
      window.scrollTo(0, 450);
      window.__scrollCheck = 450;
    `);

    // Verify initial values inside webview
    const initialScroll = await shellPage.executeInActiveWebview<number>('window.scrollY');
    expect(initialScroll).toBe(450);

    // Open Leo AI sidebar via #btn-leo
    const btnLeo = mainWindow.locator('#btn-leo');
    const leoSidebar = mainWindow.locator('#leo-sidebar');
    await btnLeo.click();
    await expect(leoSidebar).toHaveClass(/open/);

    // Expand Leo sidebar via #btn-leo-expand
    const btnExpand = mainWindow.locator('#btn-leo-expand');
    await btnExpand.click();
    await expect(leoSidebar).toHaveClass(/expanded/);

    // Active webview is still visible and interactive
    await expect(shellPage.activeWebview).toBeVisible();

    // Verify webview state was not reloaded or destroyed
    const preservedState = await shellPage.executeInActiveWebview<{ scrollY: number; val: string; marker: number }>(`
      (() => {
        const inp = document.getElementById('test-input-preserve');
        return {
          scrollY: window.scrollY,
          val: inp ? inp.value : '',
          marker: window.__scrollCheck || 0
        };
      })()
    `);
    expect(preservedState.scrollY).toBe(450);
    expect(preservedState.val).toBe('brave-preserved-data');
    expect(preservedState.marker).toBe(450);

    // Close Leo sidebar via #btn-close-leo
    const btnClose = mainWindow.locator('#btn-close-leo');
    await btnClose.click();
    await expect(leoSidebar).not.toHaveClass(/open/);

    // Webview still retains state after sidebar close
    const finalScroll = await shellPage.executeInActiveWebview<number>('window.scrollY');
    expect(finalScroll).toBe(450);
  });

  test('3.3.2 Coexistence of Internal Pages with Active Web Content', async ({ shellPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    // Tab 0: External web content
    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 1: Settings internal page
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo('brave://settings');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('settings');
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 2: History internal page
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo('brave://history');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('history');
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 3: Bookmarks internal page
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo('brave://bookmarks');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('bookmarks');
    await shellPage.waitForWebviewStopLoading(15000);

    // Total webviews in DOM is exactly 4
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(4);
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(1);

    // Switch to Tab 0: web content is intact
    await shellPage.switchTab(0);
    await expect(shellPage.urlInput).toHaveValue(cleanUrl);
    const webTitle = await shellPage.executeInActiveWebview<string>('document.title');
    expect(webTitle).toBe('Replik Clean Test Page');

    // Switch to Tab 1 (Settings): verify guest DOM elements
    await shellPage.switchTab(1);
    await expect(shellPage.urlInput).toHaveValue('brave://settings');
    const hasSettingsInput = await shellPage.executeInActiveWebview<boolean>(
      'Boolean(document.getElementById("settings-search-input"))'
    );
    expect(hasSettingsInput).toBe(true);

    // Switch to Tab 2 (History): verify guest DOM elements
    await shellPage.switchTab(2);
    await expect(shellPage.urlInput).toHaveValue('brave://history');
    const hasHistoryInput = await shellPage.executeInActiveWebview<boolean>(
      'Boolean(document.getElementById("search-input"))'
    );
    expect(hasHistoryInput).toBe(true);

    // Switch to Tab 3 (Bookmarks): verify guest DOM elements
    await shellPage.switchTab(3);
    await expect(shellPage.urlInput).toHaveValue('brave://bookmarks');
    const hasBookmarksInput = await shellPage.executeInActiveWebview<boolean>(
      'Boolean(document.getElementById("search-input"))'
    );
    expect(hasBookmarksInput).toBe(true);
  });

  test('3.3.3 Launching New Tabs from Menu While Retaining Foreground Active Tab', async ({ shellPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    const initialCount = await shellPage.tabs.count();

    // Open main hamburger menu
    await mainWindow.locator('#btn-menu').click();
    await expect(mainWindow.locator('#main-menu')).toHaveClass(/open/);

    // Click "Configuración" menu item
    await mainWindow.locator('#menu-settings').click();

    // Verify new tab is spawned and becomes active
    await expect(shellPage.tabs).toHaveCount(initialCount + 1);
    await expect(shellPage.tabs.last()).toHaveClass(/active/);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('settings');
    await expect(shellPage.urlInput).toHaveValue('brave://settings');

    // Close the settings tab
    await shellPage.closeActiveTab();

    // Verify tab count returns to initial and original tab is active
    await expect(shellPage.tabs).toHaveCount(initialCount);
    await expect(shellPage.tabs.first()).toHaveClass(/active/);
    await expect(shellPage.urlInput).toHaveValue(cleanUrl);
  });
});
