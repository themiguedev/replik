import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 2: Omnibox Boundaries & Corner Cases', () => {
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

  test('Empty and whitespace-only inputs do not trigger navigation or crash', async ({ shellPage }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    // 1. Establish baseline on known clean URL
    await shellPage.navigateTo(cleanUrl);
    await shellPage.waitForWebviewStopLoading();
    await expect(shellPage.urlInput).toHaveValue(cleanUrl);

    // 2. Clear input and submit empty string
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill('');
    await shellPage.urlInput.press('Enter');

    // Wait a brief tick to verify no navigation occurred
    await shellPage.page.waitForTimeout(500);
    const activeUrlAfterEmpty = await shellPage.getActiveWebviewUrl();
    expect(activeUrlAfterEmpty).toContain('/clean.html');

    // 3. Submit whitespace-only string ('   ')
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill('     ');
    await shellPage.urlInput.press('Enter');

    await shellPage.page.waitForTimeout(500);
    const activeUrlAfterSpaces = await shellPage.getActiveWebviewUrl();
    expect(activeUrlAfterSpaces).toContain('/clean.html');
  });

  test('Special scheme about:blank routes to New Tab Page with cleared omnibox', async ({ shellPage }) => {
    const cleanUrl = mockServer.getUrl('/clean.html', '127.0.0.1');

    // 1. Start from mock page
    await shellPage.navigateTo(cleanUrl);
    await shellPage.waitForWebviewStopLoading();
    await expect(shellPage.urlInput).toHaveValue(cleanUrl);

    // 2. Enter about:blank in Omnibox
    await shellPage.navigateTo('about:blank');
    await shellPage.waitForWebviewStopLoading();

    // 3. Verify webview loaded ntp.html
    const webviewUrl = await shellPage.getActiveWebviewUrl();
    expect(webviewUrl).toContain('ntp.html');

    // 4. Verify Omnibox is cleared and displays default placeholder
    await expect(shellPage.urlInput).toHaveValue('');
    await expect(shellPage.urlInput).toHaveAttribute('placeholder', 'Buscar en la web o ingresar una URL...');
  });

  test('Search query fallback formats queries with proper URL encoding', async ({ shellPage }) => {
    // 1. Multi-word search query
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill('privacy preserving browser');
    await expect(shellPage.urlInput).toHaveValue('privacy preserving browser');
    await shellPage.urlInput.press('Enter');

    // Assert webview src attribute receives formatted search engine URL
    await expect.poll(async () => {
      return await shellPage.page.evaluate(() => {
        const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
        return wv ? (wv.src || wv.getAttribute('src')) : '';
      });
    }, { timeout: 10000 }).toContain('search.brave.com/search?q=privacy%20preserving%20browser');

    // 2. Special characters encoding test
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill('c++ & rust? #1');
    await expect(shellPage.urlInput).toHaveValue('c++ & rust? #1');
    await shellPage.urlInput.press('Enter');

    await expect.poll(async () => {
      return await shellPage.page.evaluate(() => {
        const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
        return wv ? (wv.src || wv.getAttribute('src')) : '';
      });
    }, { timeout: 10000 }).toContain('search.brave.com/search?q=c%2B%2B%20%26%20rust%3F%20%231');
  });

  test('Quick search bang prefixes route to respective search engines', async ({ shellPage }) => {
    // Bang :g (Google)
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill(':g quantum computers');
    await expect(shellPage.urlInput).toHaveValue(':g quantum computers');
    await shellPage.urlInput.press('Enter');

    await expect.poll(async () => {
      return await shellPage.page.evaluate(() => {
        const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
        return wv ? (wv.src || wv.getAttribute('src')) : '';
      });
    }, { timeout: 10000 }).toContain('google.com/search?q=quantum%20computers');

    // Bang :gh (GitHub)
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill(':gh electron');
    await expect(shellPage.urlInput).toHaveValue(':gh electron');
    await shellPage.urlInput.press('Enter');

    await expect.poll(async () => {
      return await shellPage.page.evaluate(() => {
        const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
        return wv ? (wv.src || wv.getAttribute('src')) : '';
      });
    }, { timeout: 10000 }).toContain('github.com/search?q=electron');
  });

  test('Dot without spaces defaults to HTTPS scheme', async ({ shellPage }) => {
    await shellPage.urlInput.click();
    await shellPage.urlInput.fill('example.org');
    await expect(shellPage.urlInput).toHaveValue('example.org');
    await shellPage.urlInput.press('Enter');

    await expect.poll(async () => {
      return await shellPage.page.evaluate(() => {
        const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
        return wv ? (wv.src || wv.getAttribute('src')) : '';
      });
    }, { timeout: 10000 }).toMatch(/^https:\/\/example\.org\/?$/);
  });
});
