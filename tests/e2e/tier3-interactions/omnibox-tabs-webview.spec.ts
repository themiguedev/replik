import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 3: Omnibox Navigation + Multi-Tab Switching + Webview Visibility', () => {
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

  test('3.1.1 Multi-Tab Omnibox Input Independence and Webview Visibility Invariant', async ({ shellPage, mainWindow }) => {
    const page0Url = mockServer.getUrl('/clean.html', '127.0.0.1');
    const page1Url = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');

    // 1. Navigate Tab 0
    await shellPage.navigateTo(page0Url);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page0Url);
    await expect(shellPage.urlInput).toHaveValue(page0Url);

    // 2. Open Tab 1 via new tab button
    await shellPage.openNewTab();
    await expect(shellPage.tabs).toHaveCount(2);
    await expect(shellPage.tabs.nth(1)).toHaveClass(/active/);
    await expect(shellPage.tabs.nth(0)).not.toHaveClass(/active/);

    // Tab 1 is fresh NTP -> omnibox is empty
    await expect(shellPage.urlInput).toHaveValue('');

    // Webview visibility contract: Webview 1 is visible, Webview 0 is hidden
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(2);
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(1);
    await expect(mainWindow.locator('webview.webview-instance.hidden')).toHaveCount(1);

    // 3. In Tab 1, navigate to page1Url
    await shellPage.navigateTo(page1Url);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page1Url);
    await expect(shellPage.urlInput).toHaveValue(page1Url);

    // 4. Switch back to Tab 0
    await shellPage.switchTab(0);
    await expect(shellPage.tabs.nth(0)).toHaveClass(/active/);
    await expect(shellPage.tabs.nth(1)).not.toHaveClass(/active/);
    await expect(shellPage.urlInput).toHaveValue(page0Url);
    expect(await shellPage.getActiveWebviewUrl()).toBe(page0Url);

    // Inspect computed visibility for both webviews
    const visibilityCheck0 = await mainWindow.evaluate(() => {
      const all = Array.from(document.querySelectorAll('webview.webview-instance')) as HTMLElement[];
      return all.map((wv) => ({
        isHiddenClass: wv.classList.contains('hidden'),
        computedVisibility: window.getComputedStyle(wv).visibility,
        computedOpacity: window.getComputedStyle(wv).opacity,
      }));
    });
    expect(visibilityCheck0[0].isHiddenClass).toBe(false);
    expect(visibilityCheck0[0].computedVisibility).toBe('visible');
    expect(visibilityCheck0[0].computedOpacity).toBe('1');
    expect(visibilityCheck0[1].isHiddenClass).toBe(true);
    expect(visibilityCheck0[1].computedVisibility).toBe('hidden');
    expect(visibilityCheck0[1].computedOpacity).toBe('0');

    // 5. Switch back to Tab 1
    await shellPage.switchTab(1);
    await expect(shellPage.tabs.nth(1)).toHaveClass(/active/);
    await expect(shellPage.tabs.nth(0)).not.toHaveClass(/active/);
    await expect(shellPage.urlInput).toHaveValue(page1Url);
    expect(await shellPage.getActiveWebviewUrl()).toBe(page1Url);

    // Exactly 1 active tab and exactly 1 unhidden webview
    await expect(mainWindow.locator('#tab-bar .tab.active')).toHaveCount(1);
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(1);
  });

  test('3.1.2 Rapid Tab Switching During Asynchronous Webview Navigation', async ({ shellPage, mainWindow }) => {
    const tab1Url = mockServer.getUrl('/clean.html?tab=1', '127.0.0.1');
    const slowUrl = mockServer.getUrl('/ad-heavy.html?delay=async', '127.0.0.1');

    // Ensure we start with 2 tabs
    await shellPage.openNewTab();
    await expect(shellPage.tabs).toHaveCount(2);

    // Navigate Tab 1 to stable clean page
    await shellPage.switchTab(1);
    await shellPage.navigateTo(tab1Url);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(tab1Url);

    // Switch to Tab 0 and initiate slow navigation
    await shellPage.switchTab(0);
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill(slowUrl);
    await shellPage.urlInput.press('Enter');

    // Immediately switch back to Tab 1 while Tab 0's request is in flight
    await shellPage.switchTab(1);

    // Verify Tab 1 omnibox retains its own URL and is not corrupted by Tab 0's navigation
    await expect(shellPage.urlInput).toHaveValue(tab1Url);
    await expect(shellPage.tabs.nth(1)).toHaveClass(/active/);
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(1);

    // Wait for Tab 0's HTTP request to reach mockServer
    await expect.poll(async () => {
      const reqs = mockServer.getReceivedRequests();
      return reqs.some((r) => r.url.includes('/ad-heavy.html?delay=async'));
    }, { timeout: 15000 }).toBe(true);

    // Switch back to Tab 0: assert Tab 0 now reflects its resolved URL
    await shellPage.switchTab(0);
    await expect(shellPage.tabs.nth(0)).toHaveClass(/active/);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(slowUrl);
    await expect(shellPage.urlInput).toHaveValue(slowUrl);
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(1);
  });

  test('3.1.3 Background Tab Webview Throttling & Active Tab Webview Layering', async ({ shellPage, mainWindow }) => {
    const url0 = mockServer.getUrl('/clean.html?tab=0', '127.0.0.1');
    const url1 = mockServer.getUrl('/clean.html?tab=1', '127.0.0.1');
    const url2 = mockServer.getUrl('/clean.html?tab=2', '127.0.0.1');

    // Open Tab 0
    await shellPage.navigateTo(url0);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(url0);

    // Open Tab 1
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(url1);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(url1);

    // Open Tab 2
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(url2);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(url2);

    // All 3 webviews exist in DOM
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(3);
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(1);
    await expect(mainWindow.locator('webview.webview-instance.hidden')).toHaveCount(2);

    // Active tab (Tab 2) styles check
    const activeStyle = await mainWindow.evaluate(() => {
      const wv = document.querySelector('webview.webview-instance:not(.hidden)') as HTMLElement;
      const comp = window.getComputedStyle(wv);
      return {
        visibility: comp.visibility,
        opacity: comp.opacity,
        pointerEvents: comp.pointerEvents,
        zIndex: comp.zIndex,
        display: comp.display,
      };
    });
    expect(activeStyle.visibility).toBe('visible');
    expect(activeStyle.opacity).toBe('1');
    expect(activeStyle.pointerEvents).toBe('auto');
    expect(activeStyle.display).not.toBe('none');

    // Inactive tabs (Tab 0 & Tab 1) styles check
    const inactiveStyles = await mainWindow.evaluate(() => {
      const hiddenWvs = Array.from(document.querySelectorAll('webview.webview-instance.hidden')) as HTMLElement[];
      return hiddenWvs.map((wv) => {
        const comp = window.getComputedStyle(wv);
        return {
          visibility: comp.visibility,
          opacity: comp.opacity,
          pointerEvents: comp.pointerEvents,
          top: comp.top,
          display: comp.display,
        };
      });
    });
    expect(inactiveStyles).toHaveLength(2);
    for (const st of inactiveStyles) {
      expect(st.visibility).toBe('hidden');
      expect(st.opacity).toBe('0');
      expect(st.pointerEvents).toBe('none');
      expect(st.top).toBe('-99999px');
    }
  });
});
