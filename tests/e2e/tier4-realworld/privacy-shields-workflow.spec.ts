import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 4: Workload 4.2 Shields & Privacy Protection Workflow', () => {
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

  test('4.2.1 End-to-End Ad-Heavy Browsing Session with Dynamic Shields Override and State Persistence', async ({ shellPage, shieldsPage, mainWindow }) => {
    const adUrl = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');

    // 1. Navigate Tab 0 to ad-heavy page
    await shellPage.navigateTo(adUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(adUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // 2. Shields UP Verification
    await shieldsPage.openShields();
    await expect(shieldsPage.popupDomain).toContainText('127.0.0.1');
    await expect(shieldsPage.shieldsToggle).toBeChecked();

    const badgeCount = await shieldsPage.getBadgeBlockedCount();
    const popupCount = await shieldsPage.getPopupBlockedCount();
    expect(badgeCount).toBe(popupCount);

    const bandwidthText = await mainWindow.locator('#popup-bandwidth-saved').textContent();
    expect(bandwidthText).toMatch(/\d+(\.\d+)?\s*MB/);

    // 3. Temporary Site Exemption (Shields DOWN)
    await mainWindow.locator('label:has(#shields-toggle)').click();
    await expect(shieldsPage.shieldsToggle).not.toBeChecked();

    // Automatic reload triggered upon toggle
    await shellPage.waitForWebviewStopLoading(15000);

    const adLoadedDown = await shellPage.executeInActiveWebview<boolean>('Boolean(window.__adLoaded)');
    expect(adLoadedDown).toBe(true);

    await expect(shieldsPage.shieldsButton).toHaveClass(/disabled/);
    await expect(shieldsPage.shieldsCounter).toBeHidden();

    // 4. Persistence Across Reload & Tab Close
    await shellPage.reloadButton.click();
    await shellPage.waitForWebviewStopLoading(15000);

    const adLoadedAfterManualReload = await shellPage.executeInActiveWebview<boolean>('Boolean(window.__adLoaded)');
    expect(adLoadedAfterManualReload).toBe(true);

    // Open Tab 1 to same domain and verify per-domain exemption persists
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(adUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(adUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    const adLoadedTab1 = await shellPage.executeInActiveWebview<boolean>('Boolean(window.__adLoaded)');
    expect(adLoadedTab1).toBe(true);
    await expect(shieldsPage.shieldsButton).toHaveClass(/disabled/);

    // 5. Re-enabling Protection (Shields UP)
    await shieldsPage.openShields();
    await mainWindow.locator('label:has(#shields-toggle)').click();
    await expect(shieldsPage.shieldsToggle).toBeChecked();

    // Automatic reload upon enabling
    await shellPage.waitForWebviewStopLoading(15000);

    await expect(shieldsPage.shieldsButton).not.toHaveClass(/disabled/);
    await shieldsPage.openShields();
    const restoredCountTab1 = await shieldsPage.getBadgeBlockedCount();
    const restoredPopupCountTab1 = await shieldsPage.getPopupBlockedCount();
    expect(restoredCountTab1).toBe(restoredPopupCountTab1);
    await shieldsPage.closeShields();

    // Switch to Tab 0 and reload: verify protection restored across domain
    await shellPage.switchTab(0);
    await shellPage.reloadButton.click();
    await shellPage.waitForWebviewStopLoading(15000);

    await expect(shieldsPage.shieldsButton).not.toHaveClass(/disabled/);
  });

  test('4.2.2 Aggressive Blocking vs Standard Blocking Comparison Workflow', async ({ shellPage, shieldsPage }) => {
    const adUrl = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');

    // 1. Navigate to ad page under default Standard mode
    await shellPage.navigateTo(adUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(adUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    await shieldsPage.openShields();
    await expect(shieldsPage.shieldsToggle).toBeChecked();
    const standardCount = await shieldsPage.getBadgeBlockedCount();
    const standardPopupCount = await shieldsPage.getPopupBlockedCount();
    expect(standardCount).toBe(standardPopupCount);

    // 2. Open Shields popup and switch to Aggressive mode
    await shieldsPage.aggressiveButton.click();
    await expect(shieldsPage.aggressiveButton).toHaveText('Agresivo');

    // Auto reload happens
    await shellPage.waitForWebviewStopLoading(15000);

    await shieldsPage.openShields();
    const aggressiveCount = await shieldsPage.getBadgeBlockedCount();
    expect(aggressiveCount).toBeGreaterThanOrEqual(standardCount);

    // 3. Revert back to Standard mode to maintain clean environment
    await shieldsPage.aggressiveButton.click();
    await expect(shieldsPage.aggressiveButton).toHaveText('Estándar');
    await shellPage.waitForWebviewStopLoading(15000);

    await shieldsPage.openShields();
    await expect(shieldsPage.aggressiveButton).toHaveText('Estándar');
    await shieldsPage.closeShields();
  });
});
