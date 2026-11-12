import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 4: Workload 4.5 Sidebar & Productivity Hub Workflow', () => {
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

  test('4.5.1 Multi-Tool Productivity Session with Leo AI Sidebar, Bookmarks, and Split View', async ({ shellPage, mainWindow }) => {
    const cleanUrl0 = mockServer.getUrl('/clean.html', '127.0.0.1');
    const cleanUrl1 = mockServer.getUrl('/clean.html?side=2', '127.0.0.1');

    // 1. Open Tab 0
    await shellPage.navigateTo(cleanUrl0);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl0);
    await shellPage.waitForWebviewStopLoading(15000);

    // 2. Open Leo AI sidebar via #btn-leo
    const btnLeo = mainWindow.locator('#btn-leo');
    const leoSidebar = mainWindow.locator('#leo-sidebar');
    await btnLeo.click();
    await expect(leoSidebar).toHaveClass(/open/);

    // 3. Submit question to Leo AI and receive assistant reply
    const leoInput = mainWindow.locator('#leo-input-text');
    const btnSend = mainWindow.locator('#btn-leo-send');
    await leoInput.fill('Resumen de la pagina');
    await btnSend.click();

    await expect(mainWindow.locator('#leo-chat-stream .leo-msg.user')).toHaveText('Resumen de la pagina');
    await expect(mainWindow.locator('#leo-chat-stream .leo-msg.assistant')).toContainText('protegida por Brave Shields', { timeout: 10000 });

    // 4. Open second tab to prepare for Split View
    await shellPage.openNewTab();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
    await shellPage.navigateTo(cleanUrl1);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl1);
    await shellPage.waitForWebviewStopLoading(15000);

    // 5. Activate Split View via Alt+S accelerator
    await mainWindow.keyboard.press('Alt+s');

    const browserContent = mainWindow.locator('#browser-content');
    await expect(browserContent).toHaveClass(/split-active/);
    await expect(mainWindow.locator('#split-resizer')).toBeVisible();

    // Verify 2 webviews are visible side-by-side (split-left and split-right)
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(2);
    await expect(mainWindow.locator('webview.webview-instance.split-left')).toHaveCount(1);
    await expect(mainWindow.locator('webview.webview-instance.split-right')).toHaveCount(1);

    // 6. Double-click #split-resizer to reset to 50%/50%
    await mainWindow.locator('#split-resizer').dblclick({ force: true });
    const leftWidth = await mainWindow.locator('webview.webview-instance.split-left').evaluate((el) => (el as HTMLElement).style.width);
    expect(leftWidth).toContain('50%');

    // 7. Click #btn-playlist to add active page to Brave Playlist
    const btnPlaylist = mainWindow.locator('#btn-playlist');
    await btnPlaylist.click();

    const playlistItems = await mainWindow.evaluate(() => {
      return JSON.parse(localStorage.getItem('brave_playlist_items') || '[]');
    });
    expect(playlistItems.length).toBeGreaterThan(0);

    // 8. Close Split View and close Leo sidebar
    await mainWindow.keyboard.press('Alt+s');
    await expect(browserContent).not.toHaveClass(/split-active/);
    await expect(mainWindow.locator('#split-resizer')).toHaveCount(0);
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(1);

    const btnCloseLeo = mainWindow.locator('#btn-close-leo');
    await btnCloseLeo.click();
    await expect(leoSidebar).not.toHaveClass(/open/);
  });

  test('4.5.2 Responsive Docking / Undocking and Window Resize Invariants', async ({ mainWindow }) => {
    const sidebarDock = mainWindow.locator('#brave-sidebar-dock');
    const btnSidebarToggle = mainWindow.locator('#btn-sidebar-toggle');

    // 1. Toggle vertical sidebar dock
    const initialCollapsed = await sidebarDock.evaluate((el) => el.classList.contains('collapsed'));
    await btnSidebarToggle.click();
    const toggledCollapsed = await sidebarDock.evaluate((el) => el.classList.contains('collapsed'));
    expect(toggledCollapsed).toBe(!initialCollapsed);

    // 2. Resize window to smaller desktop dimensions (1024x768)
    await mainWindow.setViewportSize({ width: 1024, height: 768 });

    const layoutIntegrity = await mainWindow.evaluate(() => {
      const body = document.body;
      const tabBar = document.getElementById('tab-bar');
      const browserContent = document.getElementById('browser-content');
      return {
        hasHorizontalOverflow: body.scrollWidth > window.innerWidth,
        tabBarVisible: tabBar ? window.getComputedStyle(tabBar).display !== 'none' : false,
        contentVisible: browserContent ? window.getComputedStyle(browserContent).display !== 'none' : false,
      };
    });

    expect(layoutIntegrity.hasHorizontalOverflow).toBe(false);
    expect(layoutIntegrity.tabBarVisible).toBe(true);
    expect(layoutIntegrity.contentVisible).toBe(true);

    // 3. Restore window to standard size (1280x800)
    await mainWindow.setViewportSize({ width: 1280, height: 800 });
  });
});
