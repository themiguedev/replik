import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 4: Workload 4.3 Session Management & Tab Cleanup', () => {
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

  test('4.3.1 Heavy Multitasking Session with Tab Reordering, Selective Closing, and Clean Webview Process Teardown', async ({ shellPage, mainWindow }) => {
    const cleanUrl0 = mockServer.getUrl('/clean.html', '127.0.0.1');
    const adUrl1 = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');
    const cookieUrl3 = mockServer.getUrl('/cookie-test.html', '127.0.0.1');
    const cleanFinalUrl5 = mockServer.getUrl('/clean.html?item=final', '127.0.0.1');

    // 1. Batch Tab Creation (6 tabs)
    // Tab 0
    await shellPage.navigateTo(cleanUrl0);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl0);
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 1
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(adUrl1);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(adUrl1);
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 2 (Internal Settings)
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo('brave://settings');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('settings');
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 3
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(cookieUrl3);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cookieUrl3);
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 4 (Internal Downloads)
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo('brave://downloads');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('downloads');
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 5
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(cleanFinalUrl5);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanFinalUrl5);
    await shellPage.waitForWebviewStopLoading(15000);

    // Verify 6 tabs and 6 webview instances exist
    await expect(shellPage.tabs).toHaveCount(6);
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(6);

    // 2. Tab Reordering (Drag and Drop simulation)
    await mainWindow.evaluate(() => {
      const tabElements = Array.from(document.querySelectorAll('#tab-bar .tab')) as HTMLElement[];
      if (tabElements.length >= 4) {
        const fromTab = tabElements[0];
        const toTab = tabElements[3];
        const dataTransfer = new DataTransfer();
        fromTab.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
        toTab.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer, clientX: toTab.getBoundingClientRect().right - 5 }));
        toTab.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
      }
    });

    await expect(shellPage.tabs).toHaveCount(6);
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(6);

    // 3. Selective Middle Closures
    // Close Tab 2
    await shellPage.tabs.nth(2).hover();
    await shellPage.tabs.nth(2).locator('.tab-close').click();
    await expect(shellPage.tabs).toHaveCount(5);
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(5);

    // Close Tab 1
    await shellPage.tabs.nth(1).hover();
    await shellPage.tabs.nth(1).locator('.tab-close').click();
    await expect(shellPage.tabs).toHaveCount(4);
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(4);

    // 4. Zero-Tab Fallback Teardown
    while ((await shellPage.tabs.count()) > 1) {
      await shellPage.tabs.nth(0).hover();
      await shellPage.tabs.nth(0).locator('.tab-close').click();
    }
    await expect(shellPage.tabs).toHaveCount(1);

    // Close the final remaining tab
    await shellPage.tabs.nth(0).hover();
    await shellPage.tabs.nth(0).locator('.tab-close').click();

    // Verify Zero-Tab safety invariant: Replik automatically respawns 1 fresh NTP tab
    await expect(shellPage.tabs).toHaveCount(1);
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(1);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await expect(shellPage.urlInput).toHaveValue('');
  });

  test('4.3.2 Reopen Closed Tabs Workflow (Ctrl+Shift+T / Context Menu) Restoring State Hierarchy', async ({ shellPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');
    const adUrl = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');
    const cookieUrl = mockServer.getUrl('/cookie-test.html', '127.0.0.1');

    // 1. Open 3 tabs
    // Tab 0
    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 1
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(adUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(adUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 2
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(cookieUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cookieUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    await expect(shellPage.tabs).toHaveCount(3);

    // 2. Close Tab 2 (/cookie-test.html)
    await shellPage.tabs.nth(2).hover();
    await shellPage.tabs.nth(2).locator('.tab-close').click();
    await expect(shellPage.tabs).toHaveCount(2);

    // 3. Close Tab 1 (/ad-heavy.html)
    await shellPage.tabs.nth(1).hover();
    await shellPage.tabs.nth(1).locator('.tab-close').click();
    await expect(shellPage.tabs).toHaveCount(1);

    // 4. Reopen last closed tab (LIFO: /ad-heavy.html)
    await mainWindow.keyboard.press('Control+Shift+T');
    await expect(shellPage.tabs).toHaveCount(2);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('/ad-heavy.html');
    await shellPage.waitForWebviewStopLoading(15000);

    // 5. Reopen next closed tab (LIFO: /cookie-test.html)
    await mainWindow.keyboard.press('Control+Shift+T');
    await expect(shellPage.tabs).toHaveCount(3);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('/cookie-test.html');
    await shellPage.waitForWebviewStopLoading(15000);
  });
});
