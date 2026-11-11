import { Page, Locator, expect } from '@playwright/test';

export class BrowserShellPage {
  readonly page: Page;
  readonly newTabButton: Locator;
  readonly tabs: Locator;
  readonly activeTab: Locator;
  readonly activeTabTitle: Locator;
  readonly activeTabCloseButton: Locator;
  readonly urlInput: Locator;
  readonly backButton: Locator;
  readonly forwardButton: Locator;
  readonly reloadButton: Locator;
  readonly homeButton: Locator;
  readonly shieldsButton: Locator;
  readonly shieldsCounter: Locator;
  readonly activeWebview: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTabButton = page.locator('#new-tab-btn');
    this.tabs = page.locator('#tab-bar .tab');
    this.activeTab = page.locator('#tab-bar .tab.active');
    this.activeTabTitle = page.locator('#tab-bar .tab.active .tab-title');
    this.activeTabCloseButton = page.locator('#tab-bar .tab.active .tab-close');
    this.urlInput = page.locator('#url-input');
    this.backButton = page.locator('#btn-back');
    this.forwardButton = page.locator('#btn-forward');
    this.reloadButton = page.locator('#btn-reload');
    this.homeButton = page.locator('#btn-home');
    this.shieldsButton = page.locator('#shields-btn');
    this.shieldsCounter = page.locator('#shields-counter');
    this.activeWebview = page.locator('webview.webview-instance:not(.hidden)');
  }

  async openNewTab(): Promise<void> {
    const previousCount = await this.tabs.count();
    await this.newTabButton.click();
    await expect(this.tabs).toHaveCount(previousCount + 1);
  }

  async closeActiveTab(): Promise<void> {
    await this.activeTabCloseButton.click();
  }

  async switchTab(index: number): Promise<void> {
    await this.tabs.nth(index).click();
    await expect(this.tabs.nth(index)).toHaveClass(/active/);
  }

  async navigateTo(url: string): Promise<void> {
    await this.urlInput.click();
    await this.urlInput.fill(url);
    await this.urlInput.press('Enter');
  }

  async waitForWebviewStopLoading(timeout = 10000): Promise<void> {
    await expect(this.reloadButton).toHaveAttribute('title', /Recargar/, { timeout });
  }

  async getActiveWebviewUrl(): Promise<string> {
    return await this.page.evaluate(() => {
      const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
      if (!wv) return '';
      return typeof wv.getURL === 'function' ? wv.getURL() : wv.getAttribute('src') || '';
    });
  }

  async executeInActiveWebview<T = any>(script: string): Promise<T> {
    return await this.page.evaluate(async (code) => {
      const wv = document.querySelector('webview.webview-instance:not(.hidden)') as any;
      if (!wv) throw new Error('No active webview found');
      return await wv.executeJavaScript(code);
    }, script);
  }
}
