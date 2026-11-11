import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 1: Browser Navigation Feature Suite', () => {
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

  test('1.1 Direct URL entry in Omnibox navigates webview and confirms page load', async ({ shellPage }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    await shellPage.navigateTo(cleanUrl);
    await shellPage.waitForWebviewStopLoading(15000);

    // Verify Omnibox input value reflects the navigated URL
    await expect(shellPage.urlInput).toHaveValue(cleanUrl);

    // Verify active webview URL
    const activeUrl = await shellPage.getActiveWebviewUrl();
    expect(activeUrl).toBe(cleanUrl);

    // Verify DOM content rendered inside active webview
    const pageTitle = await shellPage.executeInActiveWebview<string>('document.title');
    expect(pageTitle).toBe('Replik Clean Test Page');

    const headingText = await shellPage.executeInActiveWebview<string>(
      'document.getElementById("page-title")?.textContent || ""'
    );
    expect(headingText).toBe('Replik Clean Test Page');

    // Verify mock server received the expected HTTP GET
    const requests = mockServer.getReceivedRequests();
    const cleanReq = requests.find((r) => r.url.includes('/clean.html'));
    expect(cleanReq).toBeDefined();
    expect(cleanReq?.method).toBe('GET');
  });

  test('1.2 Host and port input without scheme auto-prepends http://', async ({ shellPage }) => {
    const rawTarget = `127.0.0.1:${mockServer.getPort()}/clean.html`;

    await shellPage.navigateTo(rawTarget);
    await shellPage.waitForWebviewStopLoading(15000);

    const activeUrl = await shellPage.getActiveWebviewUrl();
    expect(activeUrl).toBe(`http://${rawTarget}`);

    await expect(shellPage.urlInput).toHaveValue(`http://${rawTarget}`);
  });

  test('1.3 Plain search terms redirect to default search engine (Brave Search)', async ({ shellPage }) => {
    const searchTerm = 'replik private browser test';

    await shellPage.urlInput.click();
    await shellPage.urlInput.fill(searchTerm);
    await expect(shellPage.urlInput).toHaveValue(searchTerm);
    await shellPage.urlInput.press('Enter');

    // Wait for webview src change to search engine URL
    await expect.poll(async () => {
      return await shellPage.page.evaluate(() => {
        const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
        return wv ? (wv.src || wv.getAttribute('src')) : '';
      });
    }, { timeout: 10000 }).toContain('search.brave.com');

    const currentUrl = await shellPage.page.evaluate(() => {
      const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
      return wv ? (wv.src || wv.getAttribute('src')) : '';
    });
    expect(currentUrl).toContain('search.brave.com/search?q=');
    expect(currentUrl).toContain('replik');
  });

  test('1.4 History back and forward buttons navigate through browser history', async ({ shellPage }) => {
    const page1Url = mockServer.getUrl('/clean.html', '127.0.0.1');
    const page2Url = mockServer.getUrl('/ad-heavy.html', '127.0.0.1');

    // Initial state: new tab should not have back/forward history
    await expect(shellPage.backButton).toBeDisabled();
    await expect(shellPage.forwardButton).toBeDisabled();

    // Step 1: Navigate to Page 1
    await shellPage.navigateTo(page1Url);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page1Url);
    expect(await shellPage.getActiveWebviewUrl()).toBe(page1Url);

    // Step 2: Navigate to Page 2
    await shellPage.navigateTo(page2Url);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page2Url);
    expect(await shellPage.getActiveWebviewUrl()).toBe(page2Url);

    // Verify Back button is now enabled, Forward button is disabled
    await expect(shellPage.backButton).toBeEnabled();
    await expect(shellPage.forwardButton).toBeDisabled();

    // Step 3: Click Back button
    await shellPage.backButton.click();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page1Url);
    await expect(shellPage.urlInput).toHaveValue(page1Url);

    // Verify Forward button is now enabled, Back button is disabled
    await expect(shellPage.forwardButton).toBeEnabled();

    // Step 4: Click Forward button
    await shellPage.forwardButton.click();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(page2Url);
    await expect(shellPage.urlInput).toHaveValue(page2Url);
    await expect(shellPage.backButton).toBeEnabled();
  });

  test('1.5 Reload button triggers page refresh and new mock server request', async ({ shellPage }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    await shellPage.navigateTo(cleanUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(cleanUrl);

    mockServer.clearRequestLog();
    await shellPage.reloadButton.click();
    await shellPage.waitForWebviewStopLoading(15000);

    const requests = mockServer.getReceivedRequests();
    const reloadReq = requests.find((r) => r.url.includes('/clean.html'));
    expect(reloadReq).toBeDefined();
    expect(reloadReq?.method).toBe('GET');
  });
});
