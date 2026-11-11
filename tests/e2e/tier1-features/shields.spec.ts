import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 1: Brave Shields & Content Filtering Feature Suite', () => {
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

  test('3.1 Shields button opens popup, displays domain details, and closes cleanly', async ({ shellPage, shieldsPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');
    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);

    // Popup initially closed
    await expect(shieldsPage.shieldsPopup).not.toHaveClass(/open/);

    // Open popup
    await shieldsPage.openShields();
    await expect(shieldsPage.shieldsPopup).toHaveClass(/open/);

    // Verify domain is reflected in popup
    await expect(shieldsPage.popupDomain).toContainText('127.0.0.1');

    // Verify default controls: visual switch labels are visible and checkboxes are attached
    await expect(mainWindow.locator('label:has(#shields-toggle)')).toBeVisible();
    await expect(shieldsPage.shieldsToggle).toBeAttached();
    await expect(shieldsPage.shieldsToggle).toBeChecked();

    await expect(mainWindow.locator('label:has(#scripts-toggle)')).toBeVisible();
    await expect(shieldsPage.scriptsToggle).toBeAttached();

    // Close popup by clicking shields button again
    await shieldsPage.closeShields();
    await expect(shieldsPage.shieldsPopup).not.toHaveClass(/open/);

    // Reopen and close with Escape key
    await shieldsPage.openShields();
    await expect(shieldsPage.shieldsPopup).toHaveClass(/open/);
    await mainWindow.keyboard.press('Escape');
    await expect(shieldsPage.shieldsPopup).not.toHaveClass(/open/);
  });

  test('3.2 Global shields toggle disables blocking and triggers webview reload', async ({ shellPage, shieldsPage, mainWindow }) => {
    const adUrl = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');
    await shellPage.navigateTo(adUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(adUrl);

    // Open popup
    await shieldsPage.openShields();
    await expect(shieldsPage.shieldsToggle).toBeChecked();

    // Toggle Shields OFF for 127.0.0.1 by clicking the switch label
    await mainWindow.locator('label:has(#shields-toggle)').click();
    await expect(shieldsPage.shieldsToggle).not.toBeChecked();

    // Reload occurs automatically on toggle; wait for completion
    await shellPage.waitForWebviewStopLoading(15000);

    // With shields OFF, the ad script executes and sets window.__adLoaded = true
    const adScriptLoaded = await shellPage.executeInActiveWebview<boolean>(
      'Boolean(window.__adLoaded)'
    );
    expect(adScriptLoaded).toBe(true);

    // Toggle Shields back ON
    await shieldsPage.openShields();
    await mainWindow.locator('label:has(#shields-toggle)').click();
    await expect(shieldsPage.shieldsToggle).toBeChecked();
    await shellPage.waitForWebviewStopLoading(15000);
  });

  test('3.3 Scripts toggle activates JavaScript blocking for domain', async ({ shellPage, shieldsPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');
    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);

    await shieldsPage.openShields();

    // Toggle scripts blocking ON by clicking scripts switch label
    await mainWindow.locator('label:has(#scripts-toggle)').click();
    await shellPage.waitForWebviewStopLoading(15000);

    // Check script toggle state
    await shieldsPage.openShields();
    await expect(shieldsPage.scriptsToggle).toBeChecked();

    // Toggle scripts blocking back OFF to restore environment
    await mainWindow.locator('label:has(#scripts-toggle)').click();
    await shellPage.waitForWebviewStopLoading(15000);

    await shieldsPage.openShields();
    await expect(shieldsPage.scriptsToggle).not.toBeChecked();
    await shieldsPage.closeShields();
  });

  test('3.4 Badge blocked counter synchronizes with popup blocked metric', async ({ shellPage, shieldsPage }) => {
    const adUrl = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');
    await shellPage.navigateTo(adUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(adUrl);

    const badgeCount = await shieldsPage.getBadgeBlockedCount();
    expect(badgeCount).toBeGreaterThanOrEqual(0);

    await shieldsPage.openShields();
    const popupCount = await shieldsPage.getPopupBlockedCount();

    expect(badgeCount).toBe(popupCount);
    await shieldsPage.closeShields();
  });
});
