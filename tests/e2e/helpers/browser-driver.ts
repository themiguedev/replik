import { Page, ElectronApplication } from '@playwright/test';
import { BrowserShellPage } from '../pages/BrowserShellPage.js';
import { ShieldsPage } from '../pages/ShieldsPage.js';

export class BrowserDriver {
  readonly shell: BrowserShellPage;
  readonly shields: ShieldsPage;

  constructor(public page: Page, public app: ElectronApplication) {
    this.shell = new BrowserShellPage(page);
    this.shields = new ShieldsPage(page);
  }

  // Navigation
  async navigateTo(url: string): Promise<void> {
    await this.shell.navigateTo(url);
  }

  async getAddressBarValue(): Promise<string> {
    return await this.page.locator('#url-input').inputValue();
  }

  // Tabs
  async createNewTab(): Promise<void> {
    await this.shell.openNewTab();
  }

  async getTabCount(): Promise<number> {
    return await this.page.locator('#tab-bar .tab').count();
  }

  async closeTab(index: number): Promise<void> {
    await this.page.locator('#tab-bar .tab').nth(index).locator('.tab-close').click();
  }

  // Shields
  async openShieldsPopup(): Promise<void> {
    await this.shields.openShields();
  }

  async toggleShields(): Promise<void> {
    await this.shields.toggleShields();
  }

  async getShieldsCounter(): Promise<number> {
    return await this.shields.getBadgeBlockedCount();
  }

  // Webview Inspection
  async getActiveWebviewUrl(): Promise<string> {
    return await this.shell.getActiveWebviewUrl();
  }

  async getActiveWebviewPartition(): Promise<string> {
    return await this.page.evaluate(() => {
      const activeWv = document.querySelector('.webview-instance:not(.hidden)') as any;
      return activeWv ? activeWv.getAttribute('partition') || '' : '';
    });
  }

  async executeInActiveWebview<T = any>(script: string): Promise<T> {
    return await this.shell.executeInActiveWebview<T>(script);
  }
}
