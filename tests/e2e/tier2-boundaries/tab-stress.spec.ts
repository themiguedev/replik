import { test, expect } from '../fixtures/index.js';

test.describe('Tier 2: Tab Stress & Zero-Tab Invariant', () => {
  test('Rapid tab creation of 12 tabs maintains DOM and webview integrity', async ({ shellPage, mainWindow }) => {
    const initialCount = await shellPage.tabs.count();
    expect(initialCount).toBeGreaterThanOrEqual(1);

    const tabsToCreate = 12;

    // Rapidly click the new tab button
    for (let i = 0; i < tabsToCreate; i++) {
      await shellPage.newTabButton.click();
    }

    // Assert tab count reaches expected total
    const expectedCount = initialCount + tabsToCreate;
    await expect(shellPage.tabs).toHaveCount(expectedCount, { timeout: 15000 });

    // Assert corresponding webview instances exist
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(expectedCount);

    // Exactly one active tab exists
    await expect(mainWindow.locator('#tab-bar .tab.active')).toHaveCount(1);

    // Exactly one active webview is visible (not hidden)
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(1);
  });

  test('Rapid tab switching under high tab count operates smoothly', async ({ shellPage, mainWindow }) => {
    // Ensure at least 5 tabs are present
    const currentCount = await shellPage.tabs.count();
    if (currentCount < 5) {
      for (let i = currentCount; i < 5; i++) {
        await shellPage.newTabButton.click();
      }
      await expect(shellPage.tabs).toHaveCount(5);
    }

    // Switch to first tab
    await shellPage.switchTab(0);
    await expect(shellPage.tabs.nth(0)).toHaveClass(/active/);

    // Switch to 3rd tab
    await shellPage.switchTab(2);
    await expect(shellPage.tabs.nth(2)).toHaveClass(/active/);

    // Switch to last tab
    const lastIndex = (await shellPage.tabs.count()) - 1;
    await shellPage.switchTab(lastIndex);
    await expect(shellPage.tabs.nth(lastIndex)).toHaveClass(/active/);

    // Verify exactly one active webview remains unhidden
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toHaveCount(1);
  });

  test('Rapid tab closing removes DOM and webview instances cleanly', async ({ shellPage, mainWindow }) => {
    // Open a burst of 5 tabs
    for (let i = 0; i < 5; i++) {
      await shellPage.newTabButton.click();
    }

    let count = await shellPage.tabs.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // Rapidly close tabs from the active tab until 2 remain
    while (count > 2) {
      const prev = count;
      await shellPage.closeActiveTab();
      await expect(shellPage.tabs).toHaveCount(prev - 1);
      count = await shellPage.tabs.count();
    }

    await expect(shellPage.tabs).toHaveCount(2);
    await expect(mainWindow.locator('webview.webview-instance')).toHaveCount(2);
    await expect(shellPage.activeTab).toBeVisible();
  });

  test('Zero-Tab Boundary: closing the last remaining tab auto-spawns a replacement NTP tab', async ({ shellPage, mainWindow }) => {
    // Close all tabs except the last one
    let count = await shellPage.tabs.count();
    while (count > 1) {
      const prev = count;
      await shellPage.closeActiveTab();
      await expect(shellPage.tabs).toHaveCount(prev - 1);
      count = await shellPage.tabs.count();
    }

    await expect(shellPage.tabs).toHaveCount(1);

    // Close the final remaining tab
    await shellPage.closeActiveTab();

    // Verify Replik auto-respawns a new tab immediately (tabs count never drops to 0)
    await expect(shellPage.tabs).toHaveCount(1, { timeout: 5000 });
    await expect(shellPage.activeTab).toBeVisible();
    await expect(mainWindow.locator('webview.webview-instance:not(.hidden)')).toBeAttached();

    // Verify replacement tab is initialized to NTP
    await expect(shellPage.urlInput).toHaveValue('');
    await expect(shellPage.urlInput).toHaveAttribute('placeholder', 'Buscar en la web o ingresar una URL...');

    // Verify browser UI remains functional by opening a new tab
    await shellPage.newTabButton.click();
    await expect(shellPage.tabs).toHaveCount(2);
  });
});
