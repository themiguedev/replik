import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 3: Brave Shields Toggle + Adblock Counters + Tab Reload', () => {
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

  test('3.2.1 Shields Toggle Triggers Active Tab Webview Reload and Counter Synchronization', async ({ shellPage, shieldsPage, mainWindow }) => {
    const adUrl = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    // 1. Navigate Tab 0 to ad-heavy page with Shields ON
    await shellPage.navigateTo(adUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(adUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // 2. Open Tab 1 and navigate to clean page
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // 3. Switch back to Tab 0
    await shellPage.switchTab(0);
    await expect(shellPage.tabs.nth(0)).toHaveClass(/active/);
    expect(await shellPage.getActiveWebviewUrl()).toBe(adUrl);

    // 4. Open Shields popup on Tab 0
    await shieldsPage.openShields();
    await expect(shieldsPage.popupDomain).toContainText('127.0.0.1');
    await expect(shieldsPage.shieldsToggle).toBeChecked();

    const badgeCount = await shieldsPage.getBadgeBlockedCount();
    const popupCount = await shieldsPage.getPopupBlockedCount();
    expect(badgeCount).toBe(popupCount);

    // 5. Toggle Shields OFF for 127.0.0.1 via label
    await mainWindow.locator('label:has(#shields-toggle)').click();
    await expect(shieldsPage.shieldsToggle).not.toBeChecked();

    // Automatic reload triggered upon toggle
    await shellPage.waitForWebviewStopLoading(15000);

    // 6. With Shields OFF, ad script executes and sets window.__adLoaded = true
    const adLoadedAfterToggle = await shellPage.executeInActiveWebview<boolean>('Boolean(window.__adLoaded)');
    expect(adLoadedAfterToggle).toBe(true);

    // Shields button reflects disabled state
    await expect(shieldsPage.shieldsButton).toHaveClass(/disabled/);
    await expect(shieldsPage.shieldsCounter).toBeHidden();

    // 7. Switch to Tab 1: Tab 1 was not affected and still functions
    await shellPage.switchTab(1);
    await expect(shellPage.tabs.nth(1)).toHaveClass(/active/);
    expect(await shellPage.getActiveWebviewUrl()).toBe(cleanUrl);

    // 8. Re-enable Shields on Tab 0 to leave environment clean
    await shellPage.switchTab(0);
    await shieldsPage.openShields();
    await mainWindow.locator('label:has(#shields-toggle)').click();
    await expect(shieldsPage.shieldsToggle).toBeChecked();
    await shellPage.waitForWebviewStopLoading(15000);
    await expect(shieldsPage.shieldsButton).not.toHaveClass(/disabled/);
  });

  test('3.2.2 Per-Domain Shields Override Across Distinct Tabs', async ({ shellPage, shieldsPage, mainWindow }) => {
    const ipAdUrl = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');
    const localhostAdUrl = mockServer.getUrl('/ad-heavy.html', 'localhost');

    // Tab 0: 127.0.0.1
    await shellPage.navigateTo(ipAdUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(ipAdUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // Tab 1: localhost
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(localhostAdUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(localhostAdUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // In Tab 0, toggle Shields OFF for 127.0.0.1
    await shellPage.switchTab(0);
    await shieldsPage.openShields();
    await expect(shieldsPage.popupDomain).toContainText('127.0.0.1');
    await mainWindow.locator('label:has(#shields-toggle)').click();
    await expect(shieldsPage.shieldsToggle).not.toBeChecked();
    await shellPage.waitForWebviewStopLoading(15000);

    // Verify Tab 0 shows Shields disabled
    await expect(shieldsPage.shieldsButton).toHaveClass(/disabled/);

    // Switch to Tab 1 (localhost)
    await shellPage.switchTab(1);
    await shieldsPage.openShields();
    await expect(shieldsPage.popupDomain).toContainText('localhost');
    // Shields must still be ON for localhost
    await expect(shieldsPage.shieldsToggle).toBeChecked();
    await expect(shieldsPage.shieldsButton).not.toHaveClass(/disabled/);

    // Switch back to Tab 0: verify 127.0.0.1 still has Shields disabled
    await shellPage.switchTab(0);
    await expect(shieldsPage.shieldsButton).toHaveClass(/disabled/);

    // Cleanup: toggle Shields back ON for 127.0.0.1
    await shieldsPage.openShields();
    await mainWindow.locator('label:has(#shields-toggle)').click();
    await expect(shieldsPage.shieldsToggle).toBeChecked();
    await shellPage.waitForWebviewStopLoading(15000);
    await expect(shieldsPage.shieldsButton).not.toHaveClass(/disabled/);
  });

  test('3.2.3 Manual Reload Preserves Adblock Blocked Metric and Shields Filter State', async ({ shellPage, shieldsPage }) => {
    const adUrl = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');

    await shellPage.navigateTo(adUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(adUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // Open Shields popup to inspect initial state
    await shieldsPage.openShields();
    await expect(shieldsPage.shieldsToggle).toBeChecked();
    await expect(shieldsPage.popupDomain).toContainText('127.0.0.1');

    const badgeBefore = await shieldsPage.getBadgeBlockedCount();
    const popupBefore = await shieldsPage.getPopupBlockedCount();
    expect(badgeBefore).toBe(popupBefore);

    await shieldsPage.closeShields();

    // Manual reload via reload button
    await shellPage.reloadButton.click();
    await shellPage.waitForWebviewStopLoading(15000);

    // Open Shields popup to verify status preserved across reload
    await shieldsPage.openShields();
    await expect(shieldsPage.shieldsToggle).toBeChecked();
    await expect(shieldsPage.popupDomain).toContainText('127.0.0.1');

    const badgeAfter = await shieldsPage.getBadgeBlockedCount();
    const popupAfter = await shieldsPage.getPopupBlockedCount();
    expect(badgeAfter).toBe(popupAfter);

    await shieldsPage.closeShields();
  });
});
