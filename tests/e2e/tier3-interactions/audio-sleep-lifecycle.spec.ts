import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 3: Audio Indicator / Mute Toggle + Tab Sleep Badge + Tab Close', () => {
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

  test('3.4.1 Audio Indicator UI Toggle and Webview Mute State Synchronization', async ({ shellPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    const audioIcon = mainWindow.locator('#tab-bar .tab.active .tab-audio-icon');

    // Initially audio icon is hidden
    await expect(audioIcon).toBeHidden();

    // Simulate audio playback event on active webview
    await mainWindow.evaluate(() => {
      const wv = document.querySelector('webview.webview-instance:not(.hidden)');
      if (wv) wv.dispatchEvent(new Event('media-started-playing'));
    });

    // Audio icon becomes visible with speaker symbol 🔊
    await expect(audioIcon).toBeVisible();
    await expect(audioIcon).toHaveText('🔊');
    await expect(audioIcon).toHaveAttribute('title', /Silenciar/);

    // Click audio icon to mute the tab
    await audioIcon.click();

    // Icon updates to muted 🔇
    await expect(audioIcon).toHaveText('🔇');
    await expect(audioIcon).toHaveClass(/muted/);
    await expect(audioIcon).toHaveAttribute('title', /Reactivar sonido/);

    // Verify native webview mute state is true
    const isMuted = await mainWindow.evaluate(() => {
      const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
      return wv && typeof wv.isAudioMuted === 'function' ? wv.isAudioMuted() : false;
    });
    expect(isMuted).toBe(true);

    // Click audio icon again to unmute
    await audioIcon.click();
    await expect(audioIcon).toHaveText('🔊');
    await expect(audioIcon).not.toHaveClass(/muted/);

    // Verify native webview mute state returns to false
    const isMutedRestored = await mainWindow.evaluate(() => {
      const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
      return wv && typeof wv.isAudioMuted === 'function' ? wv.isAudioMuted() : false;
    });
    expect(isMutedRestored).toBe(false);
  });

  test('3.4.2 Tab Sleep Badge State and Wakeup on Tab Switch', async ({ shellPage, mainWindow }) => {
    const page0Url = mockServer.getUrl('/clean.html?tab=0', '127.0.0.1');
    const page1Url = mockServer.getUrl('/clean.html?tab=1', '127.0.0.1');

    // Tab 0
    await shellPage.navigateTo(page0Url);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page0Url);

    // Tab 1
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(page1Url);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page1Url);

    // Switch back to Tab 0 so Tab 1 is in the background
    await shellPage.switchTab(0);
    await expect(shellPage.tabs.nth(0)).toHaveClass(/active/);
    await expect(shellPage.tabs.nth(1)).not.toHaveClass(/active/);

    // Right click Tab 1 to trigger context menu
    await shellPage.tabs.nth(1).click({ button: 'right' });
    const tabContextMenu = mainWindow.locator('#tab-context-menu');
    await expect(tabContextMenu).toHaveClass(/open/);

    // Click "Dormir pestaña"
    await mainWindow.locator('#tab-ctx-sleep').click();
    await expect(tabContextMenu).not.toHaveClass(/open/);

    // Tab 1 receives sleeping class and moon badge 🌙
    await expect(shellPage.tabs.nth(1)).toHaveClass(/sleeping/);
    await expect(shellPage.tabs.nth(1).locator('.tab-sleep-badge')).toHaveText('🌙');

    // Switch to Tab 1 to wake it up
    await shellPage.switchTab(1);

    // Sleep class and moon badge are removed
    await expect(shellPage.tabs.nth(1)).not.toHaveClass(/sleeping/);
    await expect(shellPage.tabs.nth(1).locator('.tab-sleep-badge')).toHaveCount(0);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page1Url);
  });

  test('3.4.3 Lifecycle Teardown: Closing Sleeping and Audible Tabs Cleans Webview Without Leak', async ({ shellPage, mainWindow }) => {
    const url0 = mockServer.getUrl('/clean.html?role=audible', '127.0.0.1');
    const url1 = mockServer.getUrl('/clean.html?role=sleeping', '127.0.0.1');
    const url2 = mockServer.getUrl('/clean.html?role=normal', '127.0.0.1');

    // Tab 0 (Audible)
    await shellPage.navigateTo(url0);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(url0);
    await mainWindow.evaluate(() => {
      const wv = document.querySelector('webview.webview-instance:not(.hidden)');
      if (wv) wv.dispatchEvent(new Event('media-started-playing'));
    });
    await expect(shellPage.tabs.nth(0).locator('.tab-audio-icon')).toBeVisible();

    // Tab 1 (To be put to sleep)
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(url1);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(url1);

    // Tab 2 (Normal)
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(url2);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(url2);

    // Switch to Tab 2 and put Tab 1 to sleep
    await shellPage.tabs.nth(1).click({ button: 'right' });
    await mainWindow.locator('#tab-ctx-sleep').click();
    await expect(shellPage.tabs.nth(1)).toHaveClass(/sleeping/);

    // Verify 3 tabs and 3 webviews exist
    await expect(shellPage.tabs).toHaveCount(3);
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(3);

    // 1. Close Tab 1 (sleeping)
    await shellPage.tabs.nth(1).hover();
    await shellPage.tabs.nth(1).locator('.tab-close').click();
    await expect(shellPage.tabs).toHaveCount(2);
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(2);

    // 2. Close Tab 0 (audible)
    await shellPage.tabs.nth(0).hover();
    await shellPage.tabs.nth(0).locator('.tab-close').click();
    await expect(shellPage.tabs).toHaveCount(1);
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(1);

    // Remaining tab is active and healthy
    await expect(shellPage.tabs.first()).toHaveClass(/active/);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(url2);
  });
});
