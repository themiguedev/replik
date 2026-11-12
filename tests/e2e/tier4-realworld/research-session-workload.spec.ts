import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 4: Workload 4.1 Full Browsing & Research Session', () => {
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

  test('4.1.1 Multi-Domain Research Workflow with Rapid Tab Cycling and Zero UI Flicker', async ({ shellPage, shieldsPage, mainWindow }) => {
    const topicPhysicsUrl = mockServer.getUrl('/clean.html?topic=physics', '127.0.0.1');
    const topicMathUrl = mockServer.getUrl('/clean.html?topic=math', '127.0.0.1');
    const topicCompUrl = mockServer.getUrl('/clean.html?topic=computing', '127.0.0.1');
    const topicAdUrl = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');

    // 1. Topic 1 in Tab 0
    await shellPage.navigateTo(topicPhysicsUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(topicPhysicsUrl);
    await shellPage.waitForWebviewStopLoading(15000);
    await expect(shellPage.urlInput).toHaveValue(topicPhysicsUrl);

    // 2. Topic 2 in Tab 1
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(topicMathUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(topicMathUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // 3. Topic 3 in Tab 2
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(topicCompUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(topicCompUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // 4. Topic 4 in Tab 3 (Ad-Supported Reference)
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(topicAdUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(topicAdUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // Verify Shields protection active on Tab 3
    await shieldsPage.openShields();
    await expect(shieldsPage.shieldsToggle).toBeChecked();
    const badgeCount = await shieldsPage.getBadgeBlockedCount();
    const popupCount = await shieldsPage.getPopupBlockedCount();
    expect(badgeCount).toBe(popupCount);
    await shieldsPage.closeShields();

    // 5. Rapid Tab Cycling (Flicker Verification)
    const cycleSequence = [0, 1, 2, 3, 0, 2, 1];
    for (const targetIdx of cycleSequence) {
      await shellPage.switchTab(targetIdx);
      await expect(shellPage.tabs.nth(targetIdx)).toHaveClass(/active/);
      await expect(mainWindow.locator('#tab-bar .tab.active')).toHaveCount(1);
      await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(1);

      const styleVerification = await mainWindow.evaluate(() => {
        const allWv = Array.from(document.querySelectorAll('webview.webview-instance')) as HTMLElement[];
        return allWv.map((wv) => {
          const style = window.getComputedStyle(wv);
          return {
            hasHiddenClass: wv.classList.contains('hidden'),
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            pointerEvents: style.pointerEvents,
          };
        });
      });

      expect(styleVerification[targetIdx].hasHiddenClass).toBe(false);
      expect(styleVerification[targetIdx].visibility).toBe('visible');
      expect(styleVerification[targetIdx].opacity).toBe('1');
      expect(styleVerification[targetIdx].pointerEvents).toBe('auto');

      // Guarantee inactive webviews have .hidden class and visibility: hidden / opacity: 0
      for (let i = 0; i < styleVerification.length; i++) {
        if (i === targetIdx) {
          expect(styleVerification[i].hasHiddenClass).toBe(false);
          expect(styleVerification[i].visibility).toBe('visible');
        } else {
          expect(styleVerification[i].hasHiddenClass).toBe(true);
          expect(styleVerification[i].visibility).toBe('hidden');
          expect(styleVerification[i].opacity).toBe('0');
        }
      }
    }

    // 6. Scroll Position Retention
    await shellPage.switchTab(1);
    await shellPage.executeInActiveWebview(`
      document.body.style.minHeight = '3000px';
      window.scrollTo(0, 300);
    `);
    const initialScrollY = await shellPage.executeInActiveWebview<number>('window.scrollY');
    expect(initialScrollY).toBe(300);

    await shellPage.switchTab(2);
    await expect(shellPage.tabs.nth(2)).toHaveClass(/active/);

    await shellPage.switchTab(1);
    await expect(shellPage.tabs.nth(1)).toHaveClass(/active/);
    const restoredScrollY = await shellPage.executeInActiveWebview<number>('window.scrollY');
    expect(restoredScrollY).toBe(300);

    // 7. Clean Session Exit
    for (const closeIdx of [3, 2, 1]) {
      await shellPage.tabs.nth(closeIdx).hover();
      await shellPage.tabs.nth(closeIdx).locator('.tab-close').click();
    }
    await expect(shellPage.tabs).toHaveCount(1);
    await expect(shellPage.tabs.nth(0)).toHaveClass(/active/);
    expect(await shellPage.getActiveWebviewUrl()).toBe(topicPhysicsUrl);
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(1);
  });

  test('4.1.2 Research Reference Cross-Check: Interleaving Internal Pages and External Web Content', async ({ shellPage, mainWindow }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    // 1. Navigate Tab 0 to clean page
    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // 2. Add current page to bookmarks via Star button
    const btnStar = mainWindow.locator('#btn-star');
    await btnStar.click();
    const bmPopup = mainWindow.locator('#bookmark-edit-popup');
    if (await bmPopup.isVisible()) {
      await mainWindow.locator('#btn-bm-popup-done').click();
      await expect(bmPopup).not.toHaveClass(/open/);
    }

    // Verify bookmark is stored in brave_bookmarks
    const storedBookmarks = await mainWindow.evaluate(() => {
      return JSON.parse(localStorage.getItem('brave_bookmarks') || '[]');
    });
    expect(storedBookmarks.some((b: any) => b.url.includes('/clean.html'))).toBe(true);

    // 3. Open Tab 1 to brave://bookmarks
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo('brave://bookmarks');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('bookmarks');
    await shellPage.waitForWebviewStopLoading(15000);

    const hasBookmarkInDom = await shellPage.executeInActiveWebview<boolean>(`
      Boolean(document.getElementById('bookmarks-list')?.textContent?.includes('clean.html'))
    `);
    expect(hasBookmarkInDom).toBe(true);

    // 4. Open Tab 2 to brave://history
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo('brave://history');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('history');
    await shellPage.waitForWebviewStopLoading(15000);

    await expect.poll(async () => {
      return await shellPage.executeInActiveWebview<boolean>(`
        Boolean(document.getElementById('history-container')?.textContent?.includes('clean.html'))
      `);
    }, { timeout: 15000 }).toBe(true);

    // 5. From brave://history, click recorded history item to navigate
    await shellPage.executeInActiveWebview(`
      const item = Array.from(document.querySelectorAll('.history-item')).find(el => el.textContent?.includes('clean.html'));
      if (item) item.click();
    `);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('/clean.html');
  });
});
