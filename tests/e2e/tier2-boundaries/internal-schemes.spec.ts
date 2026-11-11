import { test, expect } from '../fixtures/index.js';

test.describe('Tier 2: Internal Schemes Routing & Display', () => {
  test.beforeEach(async ({ shellPage }) => {
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('ntp.html');
  });

  test('brave://settings routes to settings.html and preserves omnibox representation', async ({ shellPage, driver }) => {
    await shellPage.navigateTo('brave://settings');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('settings.html');

    // 1. Verify Omnibox displays friendly brave://settings URL
    await expect(shellPage.urlInput).toHaveValue('brave://settings');

    // 2. Verify internal DOM elements exist inside guest
    const pageTitle = await driver.executeInActiveWebview<string>('document.title');
    expect(pageTitle).toMatch(/Configura/i);

    const searchInputExists = await driver.executeInActiveWebview<boolean>(
      "!!document.getElementById('settings-search-input')"
    );
    expect(searchInputExists).toBe(true);
  });

  test('brave://adblock routes to adblock.html with Shields filter controls', async ({ shellPage, driver }) => {
    await shellPage.navigateTo('brave://adblock');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('adblock.html');

    // 1. Verify Omnibox representation
    await expect(shellPage.urlInput).toHaveValue('brave://adblock');

    // 2. Verify custom rules textarea exists
    const rulesInputExists = await driver.executeInActiveWebview<boolean>(
      "!!document.getElementById('custom-rules-input')"
    );
    expect(rulesInputExists).toBe(true);
  });

  test('brave://downloads routes to downloads.html', async ({ shellPage, driver }) => {
    await shellPage.navigateTo('brave://downloads');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('downloads.html');

    // 1. Verify Omnibox representation
    await expect(shellPage.urlInput).toHaveValue('brave://downloads');

    // 2. Verify downloads action buttons exist
    const openFolderBtnExists = await driver.executeInActiveWebview<boolean>(
      "!!document.getElementById('btn-open-folder')"
    );
    expect(openFolderBtnExists).toBe(true);
  });

  test('brave://version routes to version.html and displays system diagnostics', async ({ shellPage, driver }) => {
    await shellPage.navigateTo('brave://version');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('version.html');

    // 1. Verify Omnibox representation
    await expect(shellPage.urlInput).toHaveValue('brave://version');

    // 2. Verify copy info button and version elements
    const copyBtnExists = await driver.executeInActiveWebview<boolean>(
      "!!document.getElementById('btn-copy-info')"
    );
    expect(copyBtnExists).toBe(true);
  });

  test('Internal schemes support case-insensitive input and chrome:// aliases', async ({ shellPage }) => {
    // Case-insensitive navigation
    await shellPage.navigateTo('BRAVE://SETTINGS');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('settings.html');
    await expect(shellPage.urlInput).toHaveValue('brave://settings');

    // Chrome:// alias navigation
    await shellPage.navigateTo('chrome://downloads');
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 10000 }).toContain('downloads.html');
    await expect(shellPage.urlInput).toHaveValue('brave://downloads');
  });
});
