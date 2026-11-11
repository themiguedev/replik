import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 1: Multi-Tab Management Feature Suite', () => {
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
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
  });

  test('2.1 Tab creation via button increases tab and webview count', async ({ driver, shellPage }) => {
    const initialTabCount = await driver.getTabCount();
    expect(initialTabCount).toBeGreaterThanOrEqual(1);

    await shellPage.openNewTab();

    const newTabCount = await driver.getTabCount();
    expect(newTabCount).toBe(initialTabCount + 1);

    // Verify the latest tab is active
    await expect(shellPage.tabs.last()).toHaveClass(/active/);

    // Verify only 1 tab has active class
    await expect(shellPage.page.locator('#tab-bar .tab.active')).toHaveCount(1);

    // Verify total webview instances in DOM match tab count
    await expect(shellPage.page.locator('webview.webview-instance')).toHaveCount(newTabCount);
  });

  test('2.2 Tab creation via keyboard shortcut (Control+t)', async ({ mainWindow, driver, shellPage }) => {
    const initialCount = await driver.getTabCount();

    // Ensure focus is not trapped in an input before sending shortcut
    await shellPage.urlInput.blur();
    await mainWindow.locator('#titlebar').click();
    await mainWindow.keyboard.press('Control+t');

    await expect(shellPage.tabs).toHaveCount(initialCount + 1);
    await expect(shellPage.tabs.last()).toHaveClass(/active/);
  });

  test('2.3 Tab switching alternates active state and swaps webview visibility', async ({ shellPage, driver }) => {
    const page1Url = mockServer.getUrl('/clean.html', '127.0.0.1');
    const page2Url = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');

    // Ensure we start with 2 tabs
    while ((await driver.getTabCount()) < 2) {
      await shellPage.openNewTab();
    }

    // Set Tab 0 to page1Url
    await shellPage.switchTab(0);
    await shellPage.navigateTo(page1Url);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page1Url);

    // Set Tab 1 to page2Url
    await shellPage.switchTab(1);
    await shellPage.navigateTo(page2Url);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page2Url);

    // Switch back to Tab 0
    await shellPage.switchTab(0);
    await expect(shellPage.tabs.nth(0)).toHaveClass(/active/);
    await expect(shellPage.tabs.nth(1)).not.toHaveClass(/active/);
    expect(await shellPage.getActiveWebviewUrl()).toBe(page1Url);
    await expect(shellPage.urlInput).toHaveValue(page1Url);

    // Switch to Tab 1
    await shellPage.switchTab(1);
    await expect(shellPage.tabs.nth(1)).toHaveClass(/active/);
    await expect(shellPage.tabs.nth(0)).not.toHaveClass(/active/);
    expect(await shellPage.getActiveWebviewUrl()).toBe(page2Url);
    await expect(shellPage.urlInput).toHaveValue(page2Url);
  });

  test('2.4 Active tab title updates dynamically from page title', async ({ shellPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');
    const adUrl = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');

    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);

    await expect(shellPage.activeTabTitle).toHaveText('Replik Clean Test Page', { timeout: 10000 });
    await expect(mainWindow).toHaveTitle(/Replik Clean Test Page - Brave Browser/);

    await shellPage.navigateTo(adUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(adUrl);

    await expect(shellPage.activeTabTitle).toHaveText('Replik Ad Heavy Page', { timeout: 10000 });
    await expect(mainWindow).toHaveTitle(/Replik Ad Heavy Page - Brave Browser/);
  });

  test('2.5 Tab close removes tab and webview; closing last tab maintains NTP fallback', async ({ shellPage, driver, mainWindow }) => {
    // Open tabs until we have 3
    while ((await driver.getTabCount()) < 3) {
      await shellPage.openNewTab();
    }

    const countBeforeClose = await driver.getTabCount();
    await shellPage.closeActiveTab();

    await expect(shellPage.tabs).toHaveCount(countBeforeClose - 1);
    await expect(shellPage.page.locator('webview.webview-instance')).toHaveCount(countBeforeClose - 1);
    await expect(shellPage.activeTab).toBeVisible();

    // Close with shortcut Control+w
    await mainWindow.locator('#titlebar').click();
    await mainWindow.keyboard.press('Control+w');

    await expect(shellPage.tabs).toHaveCount(countBeforeClose - 2);

    // Close all remaining tabs to test NTP fallback safety
    while ((await driver.getTabCount()) > 1) {
      await shellPage.closeActiveTab();
    }

    // Now exactly 1 tab remains. Close it.
    await shellPage.closeActiveTab();

    // Should not crash or have 0 tabs: fallback spawns new tab
    await expect(shellPage.tabs).toHaveCount(1);
    await expect(shellPage.activeTab).toBeVisible();
  });
});
