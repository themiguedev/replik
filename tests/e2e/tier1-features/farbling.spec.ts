import { test, expect } from '../fixtures/index.js';
import { MockTestServer } from '../server/mock-server.js';

test.describe('Tier 1: Brave Farbling & Anti-Fingerprinting Suite', () => {
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

  test('4.1 WebGL vendor and renderer parameters are spoofed to Brave Farbling tokens', async ({ shellPage }) => {
    const testUrl = mockServer.getUrl('/canvas-fingerprint.html', '127.0.0.1');
    await shellPage.navigateTo(testUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(testUrl);

    // Verify directly via webview JavaScript execution that farbling hooks gl.getParameter
    const webglInfo = await shellPage.executeInActiveWebview<{ vendor: string; renderer: string }>(`
      (() => {
        const glCanvas = document.createElement('canvas');
        const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
        if (!gl) return { vendor: 'error-no-webgl', renderer: 'error-no-webgl' };
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'none',
          renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'none',
        };
      })()
    `);

    expect(webglInfo.vendor).toBe('Google Inc. (Brave Shields Farbling)');
    expect(webglInfo.renderer).toBe('ANGLE (Generic Direct3D11 / Brave Shielded GPU)');
  });

  test('4.2 Hardware concurrency and device memory are normalized to generic standard', async ({ shellPage }) => {
    const testUrl = mockServer.getUrl('/clean.html', '127.0.0.1');
    await shellPage.navigateTo(testUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(testUrl);

    const hardwareCores = await shellPage.executeInActiveWebview<number>(
      'navigator.hardwareConcurrency'
    );
    expect(hardwareCores).toBe(8);

    const deviceMemory = await shellPage.executeInActiveWebview<number>(
      'navigator.deviceMemory'
    );
    expect(deviceMemory).toBe(8);

    // Battery API normalization
    const batteryStatus = await shellPage.executeInActiveWebview<{ charging: boolean; level: number }>(`
      navigator.getBattery
        ? navigator.getBattery().then(b => ({ charging: b.charging, level: b.level }))
        : Promise.resolve({ charging: true, level: 1.0 })
    `);
    expect(batteryStatus.charging).toBe(true);
    expect(batteryStatus.level).toBe(1.0);
  });

  test('4.3 Canvas 2D methods inject farbling noise into rendered pixel buffers', async ({ shellPage }) => {
    const testUrl = mockServer.getUrl('/canvas-fingerprint.html', '127.0.0.1');
    await shellPage.navigateTo(testUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(testUrl);

    // Verify toDataURL is functional and returns standard PNG base64 string
    const canvasDataUrl = await shellPage.executeInActiveWebview<string>(`
      (() => {
        const c = document.createElement('canvas');
        c.width = 100;
        c.height = 40;
        const ctx = c.getContext('2d');
        if (ctx) ctx.fillText('farbling test', 10, 10);
        return c.toDataURL();
      })()
    `);
    expect(canvasDataUrl).toMatch(/^data:image\/png;base64,/);

    // Verify getImageData noise injection (stride 128 pseudoRandom perturb)
    const farblingPerturbationDetected = await shellPage.executeInActiveWebview<boolean>(`
      (() => {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext('2d');
        if (!ctx) return false;
        // Fill canvas with solid constant color (100, 100, 100)
        ctx.fillStyle = 'rgb(100, 100, 100)';
        ctx.fillRect(0, 0, 64, 64);

        // Fetch buffer
        const imgData = ctx.getImageData(0, 0, 64, 64);
        const data = imgData.data;

        // In an un-farbled canvas, every R, G, B value is strictly 100.
        // With farbling active, bytes at stride 128 receive +/-1 noise.
        let noiseCount = 0;
        for (let i = 0; i < data.length; i += 128) {
          if (data[i] !== 100) {
            noiseCount++;
          }
        }
        return noiseCount > 0;
      })()
    `);

    expect(farblingPerturbationDetected).toBe(true);
  });

  test('4.4 Sugarcoat anti-adblock defuser exposes expected globals', async ({ shellPage }) => {
    const testUrl = mockServer.getUrl('/clean.html', '127.0.0.1');
    await shellPage.navigateTo(testUrl);
    await expect.poll(async () => await shellPage.getActiveWebviewUrl(), { timeout: 15000 }).toBe(testUrl);

    const sugarcoatGlobals = await shellPage.executeInActiveWebview<{
      canRunAds: boolean;
      isAdBlockActive: boolean;
      hasAdBlocker: boolean;
      hasAdsByGoogle: boolean;
    }>(`
      ({
        canRunAds: window.canRunAds,
        isAdBlockActive: window.isAdBlockActive,
        hasAdBlocker: window.hasAdBlocker,
        hasAdsByGoogle: typeof window.adsbygoogle !== 'undefined'
      })
    `);

    expect(sugarcoatGlobals.canRunAds).toBe(true);
    expect(sugarcoatGlobals.isAdBlockActive).toBe(false);
    expect(sugarcoatGlobals.hasAdBlocker).toBe(false);
    expect(sugarcoatGlobals.hasAdsByGoogle).toBe(true);
  });
});
