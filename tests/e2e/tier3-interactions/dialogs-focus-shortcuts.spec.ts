import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 3: Context Menus / Modals / Dialogs + Webview Focus and Keyboard Shortcuts', () => {
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

  test('3.5.1 Webview Context Menu Invocation, Action Dispatch, and Escape Dismissal', async ({ shellPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    const contextMenu = mainWindow.locator('#custom-context-menu');
    await expect(contextMenu).not.toHaveClass(/open/);

    // Open custom page context menu
    await mainWindow.evaluate(() => {
      const fn = (window as any).openPageContextMenu;
      if (typeof fn === 'function') {
        fn(120, 120, { x: 120, y: 120 });
      }
    });

    await expect(contextMenu).toHaveClass(/open/);

    // Press Escape to dismiss cleanly
    await mainWindow.keyboard.press('Escape');
    await expect(contextMenu).not.toHaveClass(/open/);

    // Open context menu again to trigger action
    await mainWindow.evaluate(() => {
      const fn = (window as any).openPageContextMenu;
      if (typeof fn === 'function') {
        fn(120, 120, { x: 120, y: 120 });
      }
    });
    await expect(contextMenu).toHaveClass(/open/);

    // Click "Recargar" from context menu
    await mainWindow.locator('#ctx-nav-reload').click();

    // Menu closes immediately and active webview reloads
    await expect(contextMenu).not.toHaveClass(/open/);
    await shellPage.waitForWebviewStopLoading(15000);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
  });

  test('3.5.2 Modal Dialogs Keystroke Trapping and Focus Return', async ({ shellPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    const taskManagerModal = mainWindow.locator('#task-manager-modal');
    const clearDataModal = mainWindow.locator('#clear-data-modal');

    // Ensure focus is outside omnibox before sending window accelerator
    await shellPage.urlInput.blur();
    await mainWindow.locator('#titlebar').click();

    // 1. Shift + Escape opens Task Manager
    await mainWindow.keyboard.press('Shift+Escape');
    await expect(taskManagerModal).toHaveClass(/open/);

    // Verify task manager table renders process rows
    await expect(mainWindow.locator('#task-manager-tbody tr')).not.toHaveCount(0);

    // Escape closes Task Manager
    await mainWindow.keyboard.press('Escape');
    await expect(taskManagerModal).not.toHaveClass(/open/);

    // 2. Control + Shift + Delete opens Clear Browsing Data modal
    await shellPage.urlInput.blur();
    await mainWindow.locator('#titlebar').click();
    await mainWindow.keyboard.press('Control+Shift+Delete');
    await expect(clearDataModal).toHaveClass(/open/);

    // Click "Cancelar" button to dismiss
    await mainWindow.locator('#btn-clear-cancel').click();
    await expect(clearDataModal).not.toHaveClass(/open/);

    // Webview remains interactive and responsive
    const webviewTitle = await shellPage.executeInActiveWebview<string>('document.title');
    expect(webviewTitle).toBe('Replik Clean Test Page');
  });

  test('3.5.3 Global Browser Keystroke Navigation (Ctrl+T, Ctrl+W, Ctrl+1..9, Ctrl+L)', async ({ shellPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // 1. Ctrl + L: Focus omnibox input
    await shellPage.urlInput.blur();
    await mainWindow.locator('#titlebar').click();
    await mainWindow.keyboard.press('Control+l');
    await expect(shellPage.urlInput).toBeFocused();

    // 2. Ctrl + T: Open new tab
    await shellPage.urlInput.blur();
    await mainWindow.locator('#titlebar').click();
    await mainWindow.keyboard.press('Control+t');
    await expect(shellPage.tabs).toHaveCount(2);
    await expect(shellPage.tabs.last()).toHaveClass(/active/);

    // 3. Ctrl + W: Close active tab
    await shellPage.urlInput.blur();
    await mainWindow.locator('#titlebar').click();
    await mainWindow.keyboard.press('Control+w');
    await expect(shellPage.tabs).toHaveCount(1);
    await expect(shellPage.tabs.first()).toHaveClass(/active/);

    // 4. Open 2 more tabs so we have 3 tabs total
    await shellPage.openNewTab();
    await shellPage.openNewTab();
    await expect(shellPage.tabs).toHaveCount(3);
    await expect(shellPage.tabs.nth(2)).toHaveClass(/active/);

    // Ctrl + 1: Switch to first tab
    await shellPage.urlInput.blur();
    await mainWindow.locator('#titlebar').click();
    await mainWindow.keyboard.press('Control+1');
    await expect(shellPage.tabs.nth(0)).toHaveClass(/active/);
    await expect(shellPage.tabs.nth(2)).not.toHaveClass(/active/);

    // Ctrl + 3: Switch to third tab
    await shellPage.urlInput.blur();
    await mainWindow.locator('#titlebar').click();
    await mainWindow.keyboard.press('Control+3');
    await expect(shellPage.tabs.nth(2)).toHaveClass(/active/);
    await expect(shellPage.tabs.nth(0)).not.toHaveClass(/active/);
  });
});
