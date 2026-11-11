import { Page, Locator, expect } from '@playwright/test';

export class ShieldsPage {
  readonly page: Page;
  readonly shieldsButton: Locator;
  readonly shieldsCounter: Locator;
  readonly shieldsPopup: Locator;
  readonly popupDomain: Locator;
  readonly popupBlockedCount: Locator;
  readonly shieldsToggle: Locator;
  readonly scriptsToggle: Locator;
  readonly aggressiveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shieldsButton = page.locator('#shields-btn');
    this.shieldsCounter = page.locator('#shields-counter');
    this.shieldsPopup = page.locator('#shields-popup');
    this.popupDomain = page.locator('#popup-domain');
    this.popupBlockedCount = page.locator('#popup-blocked-count');
    this.shieldsToggle = page.locator('#shields-toggle');
    this.scriptsToggle = page.locator('#scripts-toggle');
    this.aggressiveButton = page.locator('#btn-toggle-aggressive');
  }

  async openShields(): Promise<void> {
    if (!(await this.shieldsPopup.isVisible())) {
      await this.shieldsButton.click();
      await expect(this.shieldsPopup).toHaveClass(/open/);
    }
  }

  async closeShields(): Promise<void> {
    if (await this.shieldsPopup.isVisible()) {
      await this.shieldsButton.click();
      await expect(this.shieldsPopup).not.toHaveClass(/open/);
    }
  }

  async toggleShields(): Promise<void> {
    await this.openShields();
    await this.shieldsToggle.click({ force: true });
  }

  async toggleScripts(): Promise<void> {
    await this.openShields();
    await this.scriptsToggle.click({ force: true });
  }

  async toggleAggressive(): Promise<void> {
    await this.openShields();
    await this.aggressiveButton.click();
  }

  async getBadgeBlockedCount(): Promise<number> {
    const text = await this.shieldsCounter.textContent();
    return parseInt(text?.trim() || '0', 10);
  }

  async getPopupBlockedCount(): Promise<number> {
    const text = await this.popupBlockedCount.textContent();
    return parseInt(text?.trim() || '0', 10);
  }
}
