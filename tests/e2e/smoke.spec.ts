import { test, expect } from './fixtures/index.js';
import { MockTestServer } from './server/mock-server.js';

test.describe('Replik E2E Smoke Verification', () => {
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

  test('Electron launches and renders the main browser window with Omnibox and Shields', async ({ driver, shellPage, shieldsPage }) => {
    // 1. Verify Omnibox is present, visible, and enabled
    await expect(shellPage.urlInput).toBeVisible({ timeout: 15000 });
    await expect(shellPage.urlInput).toBeEnabled();

    // 2. Verify Tab Bar has initial tab
    const tabCount = await driver.getTabCount();
    expect(tabCount).toBeGreaterThanOrEqual(1);
    await expect(shellPage.activeTab).toBeVisible();

    // 3. Verify Shields button is visible with counter
    await expect(shieldsPage.shieldsButton).toBeVisible();
    const counter = await shieldsPage.getBadgeBlockedCount();
    expect(counter).toBeGreaterThanOrEqual(0);

    // 4. Verify Active Webview exists
    await expect(shellPage.activeWebview).toBeAttached();
  });

  test('Omnibox navigates to mock test server page and confirms page load', async ({ shellPage }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    await shellPage.navigateTo(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // Verify address bar input matches the navigated URL
    await expect(shellPage.urlInput).toHaveValue(cleanUrl);

    // Verify the mock server received the request
    const requests = mockServer.getReceivedRequests();
    const cleanRequest = requests.find((req) => req.url.includes('/clean.html'));
    expect(cleanRequest).toBeDefined();
    expect(cleanRequest?.method).toBe('GET');
  });
});
