import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 4: Workload 4.4 Omnibox Search & Direct Navigation Flow', () => {
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

  test('4.4.1 Search Autocompletion, Bang Routing, and Scheme Normalization Journey', async ({ shellPage, mainWindow }) => {
    const getWvDispatchedUrl = async () => {
      return await mainWindow.evaluate(() => {
        const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
        return wv ? (wv.src || wv.getAttribute('src') || '') : '';
      });
    };

    // 1. Plain text query: Autocompletion & Default Search Engine Dispatch
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill('privacy browser');
    await expect(mainWindow.locator('#omnibox-suggestions')).toHaveClass(/open/);
    await expect(mainWindow.locator('#omnibox-suggestions .suggestion-item')).not.toHaveCount(0);

    await shellPage.urlInput.press('Enter');
    await expect.poll(getWvDispatchedUrl, { timeout: 15000 }).toContain('search.brave.com/search?q=privacy');

    // 2. Raw domain name normalization (adds https://)
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill('brave.com');
    await shellPage.urlInput.press('Enter');
    await expect.poll(getWvDispatchedUrl, { timeout: 15000 }).toMatch(/^https:\/\/brave\.com\/?$/);

    // 3. Search Bang dispatch (:gh electron -> GitHub search)
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill(':gh electron');
    await shellPage.urlInput.press('Enter');
    await expect.poll(getWvDispatchedUrl, { timeout: 15000 }).toBe('https://github.com/search?q=electron');

    // 4. Internal Scheme Navigation (brave://settings)
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill('brave://settings');
    await shellPage.urlInput.press('Enter');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toContain('settings.html');
    await expect(shellPage.urlInput).toHaveValue('brave://settings');
    await expect(mainWindow.locator('#lock-icon')).toHaveAttribute('title', 'Configuración de Brave');
  });

  test('4.4.2 Navigation Failure Recovery with Wayback Machine Integration and Clean Recovery', async ({ shellPage, mainWindow }) => {
    const deadLinkUrl = mockServer.getUrl('/dead-link-404', '127.0.0.1');
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');
    const waybackBar = mainWindow.locator('#wayback-bar');
    const waybackText = mainWindow.locator('#wayback-text');
    const btnWaybackClose = mainWindow.locator('#btn-wayback-close');

    // 1. Navigate to 404 dead link
    await shellPage.navigateTo(deadLinkUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // 2. Wayback recovery bar triggers and displays recovery proposal
    await expect(waybackBar).toHaveClass(/active/);
    await expect(waybackText).toContainText('Wayback Machine');

    // 3. Dismiss banner manually via close button
    await btnWaybackClose.click();
    await expect(waybackBar).not.toHaveClass(/active/);

    // 4. Trigger 404 again on another endpoint
    const secondDeadLink = mockServer.getUrl('/another-missing-404', '127.0.0.1');
    await shellPage.navigateTo(secondDeadLink);
    await shellPage.waitForWebviewStopLoading(15000);
    await expect(waybackBar).toHaveClass(/active/);

    // 5. Navigate to a valid URL and verify automatic bar dismissal
    await shellPage.navigateTo(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);
    await expect(waybackBar).not.toHaveClass(/active/);
  });
});
