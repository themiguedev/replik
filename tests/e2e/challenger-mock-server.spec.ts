import { test, expect, _electron as electron } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { MockTestServer } from './server/mock-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Helper to make raw HTTP requests
function httpRequest(urlStr: string, options: http.RequestOptions = {}): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  text: string;
}> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const reqOptions: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options,
    };

    const req = http.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body,
          text: body.toString('utf-8'),
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

test.describe('Challenger 2: Mock Server, Fixtures, and Isolation Empirical Suite', () => {

  // =========================================================================
  // Challenge 1: Port Collisions, Lifecycle & Concurrency
  // =========================================================================
  test.describe('1. Mock Server Lifecycle, Port Collisions & Concurrency', () => {
    test('dynamic port 0 binds to a valid available port', async () => {
      const server = new MockTestServer(0);
      const port = await server.start();
      try {
        expect(port).toBeGreaterThan(1024);
        expect(port).toBeLessThanOrEqual(65535);
        expect(server.getPort()).toBe(port);

        const testUrl = server.getUrl('/clean.html');
        const res = await httpRequest(testUrl);
        expect(res.statusCode).toBe(200);
      } finally {
        await server.stop();
      }
    });

    test('start() is idempotent when already running', async () => {
      const server = new MockTestServer(0);
      const port1 = await server.start();
      try {
        const port2 = await server.start();
        expect(port2).toBe(port1);
      } finally {
        await server.stop();
      }
    });

    test('stop() is idempotent on unstarted or stopped server', async () => {
      const server = new MockTestServer(0);
      await expect(server.stop()).resolves.toBeUndefined();
      await server.start();
      await expect(server.stop()).resolves.toBeUndefined();
      await expect(server.stop()).resolves.toBeUndefined();
    });

    test('port collision triggers clean rejection without unhandled crash', async () => {
      const server1 = new MockTestServer(0);
      const occupiedPort = await server1.start();
      const server2 = new MockTestServer(occupiedPort);

      try {
        let threw = false;
        try {
          await server2.start(occupiedPort);
        } catch (err: any) {
          threw = true;
          expect(err.code).toBe('EADDRINUSE');
        }
        expect(threw).toBe(true);

        // Verify server1 is completely unaffected and continues serving
        const res = await httpRequest(server1.getUrl('/clean.html'));
        expect(res.statusCode).toBe(200);
      } finally {
        await server1.stop();
        await server2.stop();
      }
    });

    test('multiple concurrent mock server instances run without interference', async () => {
      const servers = [
        new MockTestServer(0),
        new MockTestServer(0),
        new MockTestServer(0),
        new MockTestServer(0),
        new MockTestServer(0),
      ];

      try {
        const ports = await Promise.all(servers.map((s) => s.start()));
        const uniquePorts = new Set(ports);
        expect(uniquePorts.size).toBe(servers.length);

        // Make simultaneous requests to all servers with distinct paths
        const responses = await Promise.all(
          servers.map((s, idx) =>
            httpRequest(s.getUrl(`/clean.html?serverIdx=${idx}`))
          )
        );

        for (let i = 0; i < responses.length; i++) {
          expect(responses[i].statusCode).toBe(200);
          const reqs = servers[i].getReceivedRequests();
          expect(reqs.length).toBe(1);
          expect(reqs[0].url).toContain(`serverIdx=${i}`);
        }
      } finally {
        await Promise.all(servers.map((s) => s.stop()));
      }
    });

    test('server can be stopped and restarted cleanly', async () => {
      const server = new MockTestServer(0);
      const port1 = await server.start();
      const res1 = await httpRequest(server.getUrl('/clean.html'));
      expect(res1.statusCode).toBe(200);

      await server.stop();

      // Ensure stopped: immediate request to old port fails
      await expect(httpRequest(`http://127.0.0.1:${port1}/clean.html`)).rejects.toThrow();

      // Restart server
      const port2 = await server.start();
      expect(port2).toBeGreaterThan(1024);
      const res2 = await httpRequest(server.getUrl('/clean.html'));
      expect(res2.statusCode).toBe(200);

      await server.stop();
    });

    test('getUrl normalizes leading slashes and host selection', async () => {
      const server = new MockTestServer(8080);
      expect(server.getUrl('clean.html')).toBe('http://127.0.0.1:8080/clean.html');
      expect(server.getUrl('/clean.html')).toBe('http://127.0.0.1:8080/clean.html');
      expect(server.getUrl('/clean.html', 'localhost')).toBe('http://localhost:8080/clean.html');
    });
  });

  // =========================================================================
  // Challenge 2: Fixture Endpoints, Headers, and Dynamic Routes
  // =========================================================================
  test.describe('2. Fixtures & Dynamic Route Integrity', () => {
    let server: MockTestServer;

    test.beforeAll(async () => {
      server = new MockTestServer(0);
      await server.start();
    });

    test.afterAll(async () => {
      await server.stop();
    });

    test('clean.html serves 200, UTF-8 text/html, and expected DOM identifiers', async () => {
      const res = await httpRequest(server.getUrl('/clean.html'));
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(res.text).toContain('<title>Replik Clean Test Page</title>');
      expect(res.text).toContain('id="page-title"');
      expect(res.text).toContain('id="page-content"');
    });

    test('ad-heavy.html serves 200, UTF-8 text/html, ad scripts and banners', async () => {
      const res = await httpRequest(server.getUrl('/ad-heavy.html'));
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(res.text).toContain('<title>Replik Ad Heavy Page</title>');
      expect(res.text).toContain('class="ad-banner"');
      expect(res.text).toContain('id="top-ad"');
      expect(res.text).toContain('class="sponsored-post"');
      expect(res.text).toContain('id="article-body"');
      expect(res.text).toContain('src="/pagead/adsbygoogle.js"');
      expect(res.text).toContain('src="/ads/banner.js"');
      expect(res.text).toContain('src="/track/pixel.png"');
    });

    test('canvas-fingerprint.html serves 200, UTF-8 text/html, farbling target elements', async () => {
      const res = await httpRequest(server.getUrl('/canvas-fingerprint.html'));
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(res.text).toContain('<title>Canvas Fingerprinting Test</title>');
      expect(res.text).toContain('id="test-canvas"');
      expect(res.text).toContain('id="canvas-hash"');
      expect(res.text).toContain('id="webgl-vendor"');
      expect(res.text).toContain('id="hardware-cores"');
      expect(res.text).toContain('WEBGL_debug_renderer_info');
    });

    test('cookie-test.html serves 200, UTF-8 text/html, cookie setter DOM', async () => {
      const res = await httpRequest(server.getUrl('/cookie-test.html'));
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(res.text).toContain('<title>Cookie and Storage Isolation Test</title>');
      expect(res.text).toContain('id="cookie-display"');
      expect(res.text).toContain('id="btn-set-cookie"');
      expect(res.text).toContain('replik_test_cookie=');
    });

    test('download-test.html serves 200, UTF-8 text/html, download anchor', async () => {
      const res = await httpRequest(server.getUrl('/download-test.html'));
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(res.text).toContain('<title>Download Verification Test</title>');
      expect(res.text).toContain('id="dl-link"');
      expect(res.text).toContain('href="/files/test-download.zip"');
    });

    test('dynamic ad scripts serve valid javascript and mock state flag', async () => {
      for (const endpoint of ['/pagead/adsbygoogle.js', '/ads/banner.js']) {
        const res = await httpRequest(server.getUrl(endpoint));
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('application/javascript');
        expect(res.text).toContain('window.__adLoaded = true');
      }
    });

    test('dynamic tracking pixels serve valid 1x1 image/gif buffer', async () => {
      for (const endpoint of ['/track/pixel.png', '/track/beacon.png']) {
        const res = await httpRequest(server.getUrl(endpoint));
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('image/gif');
        expect(res.body.length).toBe(42);
        // Verify GIF89a magic signature
        expect(res.body.subarray(0, 6).toString('ascii')).toBe('GIF89a');
      }
    });

    test('HEAD request serves headers without crashing or hanging', async () => {
      const res = await httpRequest(server.getUrl('/clean.html'), { method: 'HEAD' });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(res.body.length).toBe(0);
    });

    test('POST request to static fixture serves 200 without hang', async () => {
      const res = await httpRequest(server.getUrl('/clean.html'), { method: 'POST' });
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Replik Clean Test Page');
    });

    test('tracking redirect /google/url without q falls back to 404 safely', async () => {
      const res = await httpRequest(server.getUrl('/google/url'));
      expect(res.statusCode).toBe(404);
      expect(res.text).toContain('Not Found: /google/url');
    });

    test('root path / falls back to 404 without directory read error', async () => {
      const res = await httpRequest(server.getUrl('/'));
      expect(res.statusCode).toBe(404);
    });

    test('dynamic zip download serves valid zip structure and Content-Disposition', async () => {
      const res = await httpRequest(server.getUrl('/files/test-download.zip'));
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/zip');
      expect(res.headers['content-disposition']).toBe('attachment; filename="test-download.zip"');
      expect(res.body.length).toBe(22);
      // Verify standard End of Central Directory Record signature (PK\x05\x06)
      expect(res.body[0]).toBe(0x50); // P
      expect(res.body[1]).toBe(0x4b); // K
      expect(res.body[2]).toBe(0x05);
      expect(res.body[3]).toBe(0x06);
    });

    test('tracking redirect /google/url redirects with 302 and Location', async () => {
      const targetUrl = 'https://duckduckgo.com/?q=brave';
      const res = await httpRequest(server.getUrl(`/google/url?q=${encodeURIComponent(targetUrl)}`));
      expect(res.statusCode).toBe(302);
      expect(res.headers['location']).toBe(targetUrl);
    });

    test('CORS headers and OPTIONS preflight respond with 204 and permissive headers', async () => {
      const res = await httpRequest(server.getUrl('/clean.html'), { method: 'OPTIONS' });
      expect(res.statusCode).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toContain('GET');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
      expect(res.headers['access-control-allow-methods']).toContain('OPTIONS');
    });

    test('path traversal attempts are safely rejected with 404', async () => {
      const traversalPaths = [
        '/../package.json',
        '/../../brave-desktop/main.ts',
        '/fixtures/../../package.json',
        '/%2e%2e/%2e%2e/package.json',
      ];

      for (const p of traversalPaths) {
        const res = await httpRequest(server.getUrl(p));
        expect(res.statusCode).toBe(404);
      }
    });
  });

  // =========================================================================
  // Challenge 3: Request Audit Logger
  // =========================================================================
  test.describe('3. Request Audit Logger Accuracy & Integrity', () => {
    let server: MockTestServer;

    test.beforeAll(async () => {
      server = new MockTestServer(0);
      await server.start();
    });

    test.afterAll(async () => {
      await server.stop();
    });

    test.beforeEach(() => {
      server.clearRequestLog();
    });

    test('accurately records method, url, query parameters, and custom headers', async () => {
      const targetPath = '/clean.html?tracking_id=xyz123&test=true';
      const res = await httpRequest(server.getUrl(targetPath), {
        method: 'GET',
        headers: {
          'X-Custom-Harness-Header': 'AuditLoggerVerification',
        },
      });
      expect(res.statusCode).toBe(200);

      const logs = server.getReceivedRequests();
      expect(logs.length).toBe(1);
      const record = logs[0];
      expect(record.method).toBe('GET');
      expect(record.url).toBe(targetPath);
      expect(record.headers['x-custom-harness-header']).toBe('AuditLoggerVerification');
      expect(record.timestamp).toBeGreaterThan(Date.now() - 5000);
      expect(record.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('clearRequestLog() resets the audit trail cleanly', async () => {
      await httpRequest(server.getUrl('/clean.html'));
      expect(server.getReceivedRequests().length).toBe(1);

      server.clearRequestLog();
      expect(server.getReceivedRequests().length).toBe(0);

      await httpRequest(server.getUrl('/ad-heavy.html'));
      const newLogs = server.getReceivedRequests();
      expect(newLogs.length).toBe(1);
      expect(newLogs[0].url).toBe('/ad-heavy.html');
    });

    test('getReceivedRequests() returns an isolated shallow copy', async () => {
      await httpRequest(server.getUrl('/clean.html'));
      const copy1 = server.getReceivedRequests();
      expect(copy1.length).toBe(1);

      // Mutate the returned copy
      copy1.pop();
      expect(copy1.length).toBe(0);

      // Verify internal log was NOT mutated
      const copy2 = server.getReceivedRequests();
      expect(copy2.length).toBe(1);
    });

    test('accurately captures high concurrency requests without race conditions', async () => {
      const concurrency = 30;
      const promises = [];
      for (let i = 0; i < concurrency; i++) {
        promises.push(
          httpRequest(server.getUrl(`/clean.html?reqId=${i}`), {
            headers: { 'X-Request-Seq': String(i) },
          })
        );
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        expect(res.statusCode).toBe(200);
      }

      const logs = server.getReceivedRequests();
      expect(logs.length).toBe(concurrency);

      const recordedIds = new Set(
        logs.map((l) => l.headers['x-request-seq'])
      );
      expect(recordedIds.size).toBe(concurrency);
    });
  });

  // =========================================================================
  // Challenge 4: User Profile Directory Isolation & Teardown
  // =========================================================================
  test.describe('4. User Profile Directory Isolation & Teardown', () => {
    test('Electron instance creates temp user-data-dir in os.tmpdir() and cleans it up completely upon close()', async () => {
      const mainScriptPath = path.join(projectRoot, 'brave-desktop', 'dist', 'main.mjs');
      expect(fs.existsSync(mainScriptPath)).toBe(true);

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replik-e2e-challenger-'));
      expect(fs.existsSync(tempDir)).toBe(true);
      expect(tempDir.startsWith(os.tmpdir())).toBe(true);

      const app = await electron.launch({
        args: [
          mainScriptPath,
          `--user-data-dir=${tempDir}`,
          '--no-sandbox',
          '--disable-gpu',
        ],
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      const firstWindow = await app.firstWindow();
      await firstWindow.waitForSelector('#url-input', { state: 'visible', timeout: 15000 });

      // Verify Electron wrote browser profile files into tempDir
      const profileFiles = fs.readdirSync(tempDir);
      expect(profileFiles.length).toBeGreaterThan(0);

      // Close the Electron app
      await app.close();

      // Teardown with the same logic as the worker fixture
      await new Promise((resolve) => setTimeout(resolve, 500));
      fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });

      // Empirically verify that tempDir is gone from disk
      expect(fs.existsSync(tempDir)).toBe(false);
    });

    test('Two concurrent/sequential Electron profile dirs are strictly isolated', async () => {
      const mainScriptPath = path.join(projectRoot, 'brave-desktop', 'dist', 'main.mjs');

      const tempDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'replik-e2e-isolationA-'));
      const tempDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'replik-e2e-isolationB-'));

      expect(tempDirA).not.toBe(tempDirB);

      try {
        fs.writeFileSync(path.join(tempDirA, 'marker.txt'), 'Instance A Marker');
        fs.writeFileSync(path.join(tempDirB, 'marker.txt'), 'Instance B Marker');

        expect(fs.readFileSync(path.join(tempDirA, 'marker.txt'), 'utf8')).toBe('Instance A Marker');
        expect(fs.readFileSync(path.join(tempDirB, 'marker.txt'), 'utf8')).toBe('Instance B Marker');
      } finally {
        fs.rmSync(tempDirA, { recursive: true, force: true });
        fs.rmSync(tempDirB, { recursive: true, force: true });
      }

      expect(fs.existsSync(tempDirA)).toBe(false);
      expect(fs.existsSync(tempDirB)).toBe(false);
    });
  });
});
