import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

export interface MockRequestRecord {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  timestamp: number;
}

export class MockTestServer {
  private server: http.Server | null = null;
  private port: number = 0;
  private requests: MockRequestRecord[] = [];

  constructor(defaultPort: number = 0) {
    this.port = defaultPort;
  }

  public getPort(): number {
    return this.port;
  }

  public getReceivedRequests(): MockRequestRecord[] {
    return [...this.requests];
  }

  public clearRequestLog(): void {
    this.requests = [];
  }

  public getUrl(subPath: string, host: 'localhost' | '127.0.0.1' = '127.0.0.1'): string {
    const normalized = subPath.startsWith('/') ? subPath : `/${subPath}`;
    return `http://${host}:${this.port}${normalized}`;
  }

  public async start(desiredPort: number = this.port): Promise<number> {
    if (this.server) {
      return this.port;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const reqUrl = req.url || '/';
        const method = req.method || 'GET';

        this.requests.push({
          method,
          url: reqUrl,
          headers: req.headers,
          timestamp: Date.now(),
        });

        // Set permissive CORS headers for cross-origin test calls
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const parsedUrl = new URL(reqUrl, `http://localhost:${this.port}`);
        const pathname = parsedUrl.pathname;

        // Dynamic endpoints for ad scripts and trackers
        if (pathname === '/pagead/adsbygoogle.js' || pathname === '/ads/banner.js') {
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          res.end('/* Simulated Ad Script */ window.__adLoaded = true; console.log("Ad script executed");');
          return;
        }

        if (pathname === '/track/pixel.png' || pathname === '/track/beacon.png') {
          // 1x1 transparent GIF/PNG
          const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
          res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length,
          });
          res.end(pixel);
          return;
        }

        if (pathname === '/files/test-download.zip') {
          const dummyZip = Buffer.from('PK\x05\x06' + '\x00'.repeat(18)); // Valid empty zip signature
          res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="test-download.zip"',
            'Content-Length': dummyZip.length,
          });
          res.end(dummyZip);
          return;
        }

        if (pathname === '/google/url') {
          const target = parsedUrl.searchParams.get('q');
          if (target) {
            res.writeHead(302, { Location: target });
            res.end();
            return;
          }
        }

        // Static fixtures serving
        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        let targetFile = path.join(fixturesDir, safePath);

        if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
          const ext = path.extname(targetFile).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png',
            '.txt': 'text/plain; charset=utf-8',
          };
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          fs.createReadStream(targetFile).pipe(res);
          return;
        }

        // Fallback 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Not Found: ${pathname}`);
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(desiredPort, '0.0.0.0', () => {
        const address = this.server?.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          resolve(this.port);
        } else {
          reject(new Error('Failed to resolve server port'));
        }
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve) => {
      this.server?.close(() => {
        this.server = null;
        resolve();
      });
    });
  }
}
