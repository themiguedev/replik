import { test as base, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { BrowserDriver } from '../helpers/browser-driver.js';
import { BrowserShellPage } from '../pages/BrowserShellPage.js';
import { ShieldsPage } from '../pages/ShieldsPage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

export type ReplikTestFixtures = {
  electronApp: ElectronApplication;
  mainWindow: Page;
  driver: BrowserDriver;
  shellPage: BrowserShellPage;
  shieldsPage: ShieldsPage;
};

export const test = base.extend<ReplikTestFixtures>({
  electronApp: async ({}, use) => {
    const mainScriptPath = path.join(projectRoot, 'brave-desktop', 'dist', 'main.mjs');
    if (!fs.existsSync(mainScriptPath)) {
      throw new Error(`Build artifact not found: ${mainScriptPath}. Please run "npm run build" before running E2E tests.`);
    }

    const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replik-e2e-'));

    const app = await electron.launch({
      args: [
        mainScriptPath,
        `--user-data-dir=${tempUserDataDir}`,
        '--no-sandbox',
        '--disable-gpu',
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    await use(app);

    try {
      await app.close();
    } catch {
      // Ignore cleanup error if already closed
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      fs.rmSync(tempUserDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {
      // Temp directory cleanup failure shouldn't fail test run
    }
  },

  mainWindow: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    window.on('pageerror', (err) => console.error(`[RENDERER ERROR]:`, err));
    if (process.env.DEBUG_CONSOLE) {
      window.on('console', (msg) => console.log(`[RENDERER CONSOLE ${msg.type()}]:`, msg.text()));
    }
    await window.waitForSelector('#url-input', { state: 'visible', timeout: 20000 });
    // Wait for renderer.js to complete initialization and mount the initial active tab
    await window.waitForSelector('#tab-bar .tab.active', { state: 'visible', timeout: 20000 });
    await use(window);
  },

  driver: async ({ mainWindow, electronApp }, use) => {
    const driver = new BrowserDriver(mainWindow, electronApp);
    await use(driver);
  },

  shellPage: async ({ mainWindow }, use) => {
    const shellPage = new BrowserShellPage(mainWindow);
    await use(shellPage);
  },

  shieldsPage: async ({ mainWindow }, use) => {
    const shieldsPage = new ShieldsPage(mainWindow);
    await use(shieldsPage);
  },
});

export { expect } from '@playwright/test';
