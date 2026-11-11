import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 2: Navigation Limits & Error Recovery', () => {
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

  test('Back and forward buttons are disabled on fresh launch with empty history', async ({ shellPage }) => {
    // Initial launch state has no back or forward navigation history
    await expect(shellPage.backButton).toBeDisabled();
    await expect(shellPage.forwardButton).toBeDisabled();

    // Clicking disabled buttons does not trigger navigation or errors
    await shellPage.backButton.click({ force: true });
    await shellPage.forwardButton.click({ force: true });

    await expect(shellPage.backButton).toBeDisabled();
    await expect(shellPage.forwardButton).toBeDisabled();
  });

  test('Back and forward button states transition dynamically across history navigation', async ({ shellPage }) => {
    const pageA = mockServer.getUrl('/clean.html?page=A', '127.0.0.1');
    const pageB = mockServer.getUrl('/clean.html?page=B', '127.0.0.1');

    // 1. Navigate to Page A
    await shellPage.navigateTo(pageA);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toBe(pageA);
    await expect(shellPage.forwardButton).toBeDisabled();

    // 2. Navigate to Page B
    await shellPage.navigateTo(pageB);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toBe(pageB);

    // Back button should now be enabled; Forward button remains disabled
    await expect(shellPage.backButton).toBeEnabled();
    await expect(shellPage.forwardButton).toBeDisabled();

    // 3. Click Back button to return to Page A
    await shellPage.backButton.click();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toBe(pageA);

    // Now forward button should be enabled
    await expect(shellPage.forwardButton).toBeEnabled();
    await expect(shellPage.urlInput).toHaveValue(pageA);

    // 4. Click Forward button to return to Page B
    await shellPage.forwardButton.click();
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toBe(pageB);

    // Forward button becomes disabled again; Back button is enabled
    await expect(shellPage.forwardButton).toBeDisabled();
    await expect(shellPage.backButton).toBeEnabled();
    await expect(shellPage.urlInput).toHaveValue(pageB);
  });

  test('Failed navigation on HTTP 404 triggers Wayback error recovery banner', async ({ shellPage, mainWindow }) => {
    const notFoundUrl = mockServer.getUrl('/non-existent-endpoint-404', '127.0.0.1');

    await shellPage.navigateTo(notFoundUrl);

    const waybackBar = mainWindow.locator('#wayback-bar');
    const waybackCloseBtn = mainWindow.locator('#btn-wayback-close');

    // Assert error recovery banner is activated and visible
    await expect(waybackBar).toHaveClass(/active/, { timeout: 10000 });
    await expect(waybackBar).toBeVisible();
    await expect(mainWindow.locator('#wayback-text')).toContainText('Wayback Machine');

    // Dismiss banner via close button
    await waybackCloseBtn.click();
    await expect(waybackBar).not.toHaveClass(/active/);
    await expect(waybackBar).not.toBeVisible();
  });

  test('Error recovery banner automatically dismisses upon successful navigation to valid page', async ({ shellPage, mainWindow }) => {
    // 1. Trigger error recovery banner with HTTP 404
    const notFoundUrl = mockServer.getUrl('/missing-recovery-page', '127.0.0.1');
    await shellPage.navigateTo(notFoundUrl);

    const waybackBar = mainWindow.locator('#wayback-bar');
    await expect(waybackBar).toHaveClass(/active/, { timeout: 10000 });

    // 2. Navigate to valid clean page: recovery banner should automatically hide
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');
    await shellPage.navigateTo(cleanUrl);
    await shellPage.waitForWebviewStopLoading();

    await expect(waybackBar).not.toHaveClass(/active/);
    await expect(shellPage.urlInput).toHaveValue(cleanUrl);
  });
});
