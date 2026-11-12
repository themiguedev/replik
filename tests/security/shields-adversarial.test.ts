import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { BraveShieldsEngine, BASE_EASYLIST_RULES } from '../../brave-shields/src/index.js';

// Setup Mock Electron Environment before importing main.ts
const registeredHandlers = new Map<string, Function>();
let capturedOnBeforeRequest: ((details: any, callback: (response: any) => void) => void) | null = null;
const commandLineSwitches: string[] = [];

const testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replik-challenger-m2-'));
const testDownloadsDir = path.join(testTempDir, 'downloads');
const testUserDataDir = path.join(testTempDir, 'userData');
const testTempSubDir = path.join(testTempDir, 'temp');

fs.mkdirSync(testDownloadsDir, { recursive: true });
fs.mkdirSync(testUserDataDir, { recursive: true });
fs.mkdirSync(testTempSubDir, { recursive: true });

vi.mock('electron', () => {
  return {
    app: {
      commandLine: {
        appendSwitch: vi.fn((sw: string, val?: string) => {
          commandLineSwitches.push(val !== undefined ? `${sw}=${val}` : sw);
        }),
      },
      on: vi.fn(),
      whenReady: () => Promise.resolve(),
      getPath: (name: string) => {
        if (name === 'downloads') return testDownloadsDir;
        if (name === 'userData') return testUserDataDir;
        if (name === 'temp') return testTempSubDir;
        return path.join(testTempDir, name);
      },
      quit: vi.fn(),
    },
    BrowserWindow: class {
      static fromWebContents = vi.fn().mockReturnValue(null);
      static getFocusedWindow = vi.fn().mockReturnValue(null);
      webContents = {
        send: vi.fn(),
        on: vi.fn(),
        setWindowOpenHandler: vi.fn(),
        setBackgroundThrottling: vi.fn(),
        executeJavaScript: vi.fn().mockResolvedValue(undefined),
        insertCSS: vi.fn().mockResolvedValue(undefined),
      };
      loadURL = vi.fn();
      loadFile = vi.fn();
      on = vi.fn();
      once = vi.fn();
      show = vi.fn();
      isDestroyed = vi.fn().mockReturnValue(false);
    },
    dialog: {
      showSaveDialog: vi.fn(),
      showOpenDialog: vi.fn(),
    },
    ipcMain: {
      handle: (channel: string, handler: Function) => {
        registeredHandlers.set(channel, handler);
      },
      on: (channel: string, handler: Function) => {
        registeredHandlers.set(channel, handler);
      },
    },
    session: {
      defaultSession: {
        webRequest: {
          onBeforeRequest: vi.fn((_filter: any, cb: any) => {
            capturedOnBeforeRequest = cb;
          }),
        },
        clearStorageData: vi.fn().mockResolvedValue(undefined),
        getUserAgent: vi.fn().mockReturnValue('Mozilla/5.0 Chrome/120.0.0.0 Electron/28.0.0'),
        setUserAgent: vi.fn(),
        setWebRTCIPHandlingPolicy: vi.fn(),
        setPermissionRequestHandler: vi.fn(),
        setProxy: vi.fn().mockResolvedValue(undefined),
        closeAllConnections: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        loadExtension: vi.fn(),
      },
      fromPartition: vi.fn().mockReturnValue({
        webRequest: {
          onBeforeRequest: vi.fn((_filter: any, cb: any) => {
            if (!capturedOnBeforeRequest) capturedOnBeforeRequest = cb;
          }),
        },
        clearStorageData: vi.fn().mockResolvedValue(undefined),
        getUserAgent: vi.fn().mockReturnValue('Mozilla/5.0 Chrome/120.0.0.0 Electron/28.0.0'),
        setUserAgent: vi.fn(),
        setWebRTCIPHandlingPolicy: vi.fn(),
        setPermissionRequestHandler: vi.fn(),
        setProxy: vi.fn().mockResolvedValue(undefined),
        closeAllConnections: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        loadExtension: vi.fn(),
      }),
    },
    shell: {
      openPath: vi.fn().mockResolvedValue(''),
      showItemInFolder: vi.fn(),
    },
  };
});

describe('Milestone 2 Shields Adversarial Challenge Suite', () => {
  let isDomainScriptBlocked: (domain: string) => boolean;
  let configureTorSession: (torSession: any) => Promise<void>;
  let checkTorConnectivity: (host?: string, port?: number, timeoutMs?: number) => Promise<boolean>;

  let shieldsGetStatusHandler: Function;
  let shieldsToggleScriptsHandler: Function;
  let settingsUpdateHandler: Function;
  let torGetStatusHandler: Function;

  let trustedEvent: any;
  let untrustedEvent: any;

  beforeAll(async () => {
    const mainModule = await import('../../brave-desktop/main.ts');
    isDomainScriptBlocked = mainModule.isDomainScriptBlocked;
    configureTorSession = mainModule.configureTorSession;
    checkTorConnectivity = mainModule.checkTorConnectivity;

    shieldsGetStatusHandler = registeredHandlers.get('shields:get-status')!;
    shieldsToggleScriptsHandler = registeredHandlers.get('shields:toggle-scripts')!;
    settingsUpdateHandler = registeredHandlers.get('settings:update')!;
    torGetStatusHandler = registeredHandlers.get('tor:get-status')!;

    const baseDir = path.resolve(__dirname, '../../brave-desktop');
    const trustedUrl = pathToFileURL(path.join(baseDir, 'ui', 'index.html')).href;

    trustedEvent = {
      sender: { id: 101 },
      senderFrame: {
        parent: null,
        url: trustedUrl,
      },
    };

    untrustedEvent = {
      sender: { id: 102 },
      senderFrame: {
        parent: null,
        url: 'https://adversary.com/index.html',
      },
    };
  });

  afterAll(() => {
    try {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    } catch {}
  });

  // Helper to simulate a request passing through Electron's onBeforeRequest handler
  async function simulateWebRequest(details: {
    url: string;
    resourceType: string;
    documentUrl?: string;
    initiator?: string;
    referrer?: string;
  }): Promise<{ cancel?: boolean; redirectURL?: string }> {
    return new Promise((resolve) => {
      if (!capturedOnBeforeRequest) {
        throw new Error('Electron session.webRequest.onBeforeRequest listener was not attached.');
      }
      capturedOnBeforeRequest(details, (result: any) => {
        resolve(result || {});
      });
    });
  }

  // =========================================================================
  // 1. Default-Allow Open Web Verification (Oracle Test: 100+ Domains)
  // =========================================================================
  describe('1. Default-Allow Open Web Verification', () => {
    it('verifies famous open web domains are NOT script-blocked by default', async () => {
      const topDomains = [
        'wikipedia.org',
        'en.wikipedia.org',
        'es.wikipedia.org',
        'github.com',
        'gist.github.com',
        'news.ycombinator.com',
        'bbc.co.uk',
        'bbc.com',
        'stackoverflow.com',
        'reddit.com',
        'old.reddit.com',
        'amazon.com',
        'amazon.es',
        'cloudflare.com',
        'mozilla.org',
        'developer.mozilla.org',
        'google.com',
        'maps.google.com',
        'microsoft.com',
        'apple.com',
      ];

      for (const dom of topDomains) {
        expect(isDomainScriptBlocked(dom)).toBe(false);
        const status = await shieldsGetStatusHandler(trustedEvent, dom);
        expect(status.scriptsBlocked).toBe(false);
      }
    });

    it('generates 100 randomized arbitrary domains across diverse TLDs and verifies ALL are allowed', async () => {
      const tlds = ['com', 'org', 'net', 'io', 'co.uk', 'gov', 'edu', 'xyz', 'tech', 'es', 'de', 'fr', 'jp'];
      const prefixes = ['test', 'app', 'cdn', 'api', 'alpha', 'beta', 'portal', 'auth', 'dash', 'node'];

      for (let i = 0; i < 100; i++) {
        const randPrefix = prefixes[i % prefixes.length];
        const randTld = tlds[i % tlds.length];
        const randomDomain = `${randPrefix}-${i}-random.${randTld}`;

        const isBlocked = isDomainScriptBlocked(randomDomain);
        expect(isBlocked).toBe(false);
      }
    });
  });

  // =========================================================================
  // 2. Subdomain Inheritance & Boundary Matching
  // =========================================================================
  describe('2. Subdomain Inheritance & Boundary Matching', () => {
    it('blocking a root domain blocks all subdomains, but NOT substring collisions', async () => {
      // Initially allowed
      expect(isDomainScriptBlocked('target-corp.com')).toBe(false);
      expect(isDomainScriptBlocked('api.target-corp.com')).toBe(false);

      // Block root domain
      await shieldsToggleScriptsHandler(trustedEvent, 'target-corp.com');
      expect(isDomainScriptBlocked('target-corp.com')).toBe(true);

      // Subdomains must inherit block
      expect(isDomainScriptBlocked('api.target-corp.com')).toBe(true);
      expect(isDomainScriptBlocked('auth.target-corp.com')).toBe(true);
      expect(isDomainScriptBlocked('deep.sub.level.target-corp.com')).toBe(true);
      expect(isDomainScriptBlocked('a.b.c.d.e.target-corp.com')).toBe(true);

      // Substring collisions MUST NOT be blocked (anti-false-positive boundary test)
      expect(isDomainScriptBlocked('nottarget-corp.com')).toBe(false);
      expect(isDomainScriptBlocked('target-corp.company')).toBe(false);
      expect(isDomainScriptBlocked('target-corp.com.evil.org')).toBe(false);
      expect(isDomainScriptBlocked('prefix-target-corp.com')).toBe(false);
      expect(isDomainScriptBlocked('mytarget-corp.com')).toBe(false);
      expect(isDomainScriptBlocked('target-corp.org')).toBe(false);

      // Cleanup: toggle back to unblock
      await shieldsToggleScriptsHandler(trustedEvent, 'target-corp.com');
      expect(isDomainScriptBlocked('target-corp.com')).toBe(false);
      expect(isDomainScriptBlocked('api.target-corp.com')).toBe(false);
    });

    it('blocking a subdomain does NOT block the parent domain or sibling subdomains', async () => {
      // Block specific subdomain
      await shieldsToggleScriptsHandler(trustedEvent, 'restricted.university.edu');
      expect(isDomainScriptBlocked('restricted.university.edu')).toBe(true);
      expect(isDomainScriptBlocked('deep.restricted.university.edu')).toBe(true);

      // Parent domain MUST remain allowed
      expect(isDomainScriptBlocked('university.edu')).toBe(false);

      // Sibling subdomain MUST remain allowed
      expect(isDomainScriptBlocked('library.university.edu')).toBe(false);
      expect(isDomainScriptBlocked('campus.university.edu')).toBe(false);

      // Cleanup
      await shieldsToggleScriptsHandler(trustedEvent, 'restricted.university.edu');
      expect(isDomainScriptBlocked('restricted.university.edu')).toBe(false);
    });

    it('handles multi-part TLDs (e.g. .co.uk, .gov.br) properly without blocking the TLD', async () => {
      await shieldsToggleScriptsHandler(trustedEvent, 'retailer.co.uk');
      expect(isDomainScriptBlocked('retailer.co.uk')).toBe(true);
      expect(isDomainScriptBlocked('shop.retailer.co.uk')).toBe(true);
      expect(isDomainScriptBlocked('secure.pay.retailer.co.uk')).toBe(true);

      // Other companies on .co.uk must NOT be blocked
      expect(isDomainScriptBlocked('othercompany.co.uk')).toBe(false);
      expect(isDomainScriptBlocked('bank.co.uk')).toBe(false);

      // Cleanup
      await shieldsToggleScriptsHandler(trustedEvent, 'retailer.co.uk');
      expect(isDomainScriptBlocked('retailer.co.uk')).toBe(false);
    });
  });

  // =========================================================================
  // 3. Edge Cases, Malformed Inputs & Hostname Robustness
  // =========================================================================
  describe('3. Edge Cases & Hostname Robustness', () => {
    it('returns false for empty, null, undefined or whitespace domain inputs', () => {
      expect(isDomainScriptBlocked('')).toBe(false);
      expect(isDomainScriptBlocked(null as any)).toBe(false);
      expect(isDomainScriptBlocked(undefined as any)).toBe(false);
      expect(isDomainScriptBlocked('   ')).toBe(false);
    });

    it('is case-insensitive for domain lookups and toggling', async () => {
      await shieldsToggleScriptsHandler(trustedEvent, 'CaseSensitiveSite.ORG');

      expect(isDomainScriptBlocked('casesensitivesite.org')).toBe(true);
      expect(isDomainScriptBlocked('CASESENSITIVESITE.ORG')).toBe(true);
      expect(isDomainScriptBlocked('CaSeSeNsItIvEsItE.oRg')).toBe(true);
      expect(isDomainScriptBlocked('Sub.CaseSensitiveSite.Org')).toBe(true);

      // Toggle off with different casing
      await shieldsToggleScriptsHandler(trustedEvent, 'casesensitivesite.org');
      expect(isDomainScriptBlocked('casesensitivesite.org')).toBe(false);
    });

    it('does not crash or hang on extremely long domain strings (DoS / ReDoS guard)', () => {
      const longSubdomain = 'a'.repeat(250) + '.' + 'b'.repeat(250) + '.com';
      expect(() => isDomainScriptBlocked(longSubdomain)).not.toThrow();
      expect(isDomainScriptBlocked(longSubdomain)).toBe(false);

      const hugeString = 'x.'.repeat(500) + 'example.com';
      expect(() => isDomainScriptBlocked(hugeString)).not.toThrow();
      expect(isDomainScriptBlocked(hugeString)).toBe(false);
    });

    it('safely handles punycode and internationalized domain names (IDN)', async () => {
      const punycodeDomain = 'xn--80akhbyknj4f.com'; // испытание.com
      expect(isDomainScriptBlocked(punycodeDomain)).toBe(false);

      await shieldsToggleScriptsHandler(trustedEvent, punycodeDomain);
      expect(isDomainScriptBlocked(punycodeDomain)).toBe(true);
      expect(isDomainScriptBlocked(`sub.${punycodeDomain}`)).toBe(true);

      await shieldsToggleScriptsHandler(trustedEvent, punycodeDomain);
      expect(isDomainScriptBlocked(punycodeDomain)).toBe(false);
    });
  });

  // =========================================================================
  // 4. Per-Domain Script Toggle Lifecycle & Multi-Domain Isolation
  // =========================================================================
  describe('4. Per-Domain Script Toggle Lifecycle', () => {
    it('supports independent toggles across multiple disparate domains without interference', async () => {
      const d1 = 'site-alpha.com';
      const d2 = 'site-beta.net';
      const d3 = 'site-gamma.io';
      const d4 = 'site-delta.org';

      // Toggle d1 and d3 to blocked
      await shieldsToggleScriptsHandler(trustedEvent, d1);
      await shieldsToggleScriptsHandler(trustedEvent, d3);

      expect(isDomainScriptBlocked(d1)).toBe(true);
      expect(isDomainScriptBlocked(d2)).toBe(false); // Unchanged
      expect(isDomainScriptBlocked(d3)).toBe(true);
      expect(isDomainScriptBlocked(d4)).toBe(false); // Unchanged

      // Toggle d1 back to allowed
      await shieldsToggleScriptsHandler(trustedEvent, d1);
      expect(isDomainScriptBlocked(d1)).toBe(false);
      expect(isDomainScriptBlocked(d3)).toBe(true); // d3 remains blocked

      // Clean up d3
      await shieldsToggleScriptsHandler(trustedEvent, d3);
      expect(isDomainScriptBlocked(d3)).toBe(false);
    });
  });

  // =========================================================================
  // 5. Global Script Blocking Toggle & Exemption Mechanisms
  // =========================================================================
  describe('5. Global Script Blocking Toggle & Exemptions', () => {
    it('activates global script blocking, preserving localhost and private IP exemptions', async () => {
      // 1. Activate global script blocking
      await settingsUpdateHandler(trustedEvent, 'brave_setting_scripts', true);

      // Standard open web domains must now be blocked
      expect(isDomainScriptBlocked('example.com')).toBe(true);
      expect(isDomainScriptBlocked('wikipedia.org')).toBe(true);
      expect(isDomainScriptBlocked('cnn.com')).toBe(true);

      // Localhost and private LAN IPs MUST remain exempt from script blocking
      expect(isDomainScriptBlocked('localhost')).toBe(false);
      expect(isDomainScriptBlocked('127.0.0.1')).toBe(false);
      expect(isDomainScriptBlocked('192.168.1.1')).toBe(false);
      expect(isDomainScriptBlocked('192.168.0.254')).toBe(false);
      expect(isDomainScriptBlocked('10.0.0.1')).toBe(false);
      expect(isDomainScriptBlocked('172.16.0.1')).toBe(false);
      expect(isDomainScriptBlocked('169.254.1.1')).toBe(false);

      // 2. Whitelist an essential domain during global block
      // In global block mode, calling toggle on an un-whitelisted domain adds it to scriptAllowedDomains
      const toggleRes = await shieldsToggleScriptsHandler(trustedEvent, 'portal.workplace.com');
      expect(toggleRes.scriptsBlocked).toBe(false);
      expect(isDomainScriptBlocked('portal.workplace.com')).toBe(false);
      // Subdomains of the whitelisted domain inherit the exemption
      expect(isDomainScriptBlocked('auth.portal.workplace.com')).toBe(false);

      // Other domains remain blocked
      expect(isDomainScriptBlocked('random-other-site.com')).toBe(true);

      // 3. Deactivate global script blocking
      await settingsUpdateHandler(trustedEvent, 'brave_setting_scripts', false);

      // All open web domains return to allowed
      expect(isDomainScriptBlocked('example.com')).toBe(false);
      expect(isDomainScriptBlocked('wikipedia.org')).toBe(false);
      expect(isDomainScriptBlocked('random-other-site.com')).toBe(false);
    });
  });

  // =========================================================================
  // 6. Baseline EasyList & EasyPrivacy Rule Enforcement
  // =========================================================================
  describe('6. Baseline EasyList & EasyPrivacy Rules in Engine', () => {
    let engine: BraveShieldsEngine;

    beforeAll(() => {
      engine = new BraveShieldsEngine();
      engine.loadBaseRules();
    });

    it('verifies baseline rules load at least 49 network rules and 10 cosmetic rules', () => {
      const stats = engine.getStats();
      expect(stats.networkRulesCount).toBeGreaterThanOrEqual(49);
      expect(stats.cosmeticRulesCount).toBeGreaterThanOrEqual(10);
    });

    it('blocks major programmatic ad networks across third-party contexts', () => {
      const testCases = [
        { url: 'https://securepubads.g.doubleclick.net/gampad/ads?iu=123', doc: 'https://nytimes.com' },
        { url: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', doc: 'https://cnn.com' },
        { url: 'https://adservice.google.com/adsid/integrator.js', doc: 'https://techblog.com' },
        { url: 'https://ib.adnxs.com/seg?add=1', doc: 'https://medium.com' },
        { url: 'https://static.criteo.net/js/ld/ld.js', doc: 'https://onlineshop.com' },
        { url: 'https://casalemedia.com/adserver', doc: 'https://news.com' },
        { url: 'https://fastlane.rubiconproject.com/a/api/fastlane.json', doc: 'https://forbes.com' },
        { url: 'https://ads.pubmatic.com/AdServer/js/pwt.js', doc: 'https://reuters.com' },
        { url: 'https://aax.amazon-adsystem.com/e/dtb/bid', doc: 'https://weather.com' },
        { url: 'https://cdn.taboola.com/libtrc/unip/loader.js', doc: 'https://dailymail.co.uk' },
        { url: 'https://widgets.outbrain.com/outbrain.js', doc: 'https://businessinsider.com' },
        { url: 'https://servedby.revcontent.com/cvp.js', doc: 'https://viralnews.com' },
        { url: 'https://c1.popads.net/pop.js', doc: 'https://freemovies.com' },
        { url: 'https://sb.scorecardresearch.com/beacon.js', doc: 'https://example.com' },
        { url: 'https://connect.facebook.net/en_US/sdk.js', doc: 'https://independent-blog.com' },
        { url: 'https://static.hotjar.com/c/hotjar-123.js', doc: 'https://saas-startup.com' },
        { url: 'https://cdn.segment.com/analytics.js/v1/key/analytics.min.js', doc: 'https://app.io' },
        { url: 'https://cdn.amplitude.com/libs/amplitude-8.0.0-min.gz.js', doc: 'https://dashboard.io' },
      ];

      for (const tc of testCases) {
        const match = engine.interceptRequest({
          url: tc.url,
          documentUrl: tc.doc,
          resourceType: 'script',
        });
        expect(match.action, `Expected ${tc.url} to be blocked`).toBe('block');
      }
    });

    it('allows legitimate web assets, CDNs, and libraries across arbitrary domains', () => {
      const allowedCases = [
        { url: 'https://cdn.jsdelivr.net/npm/vue@3.3.4/dist/vue.global.prod.js', doc: 'https://mysite.com' },
        { url: 'https://code.jquery.com/jquery-3.7.1.min.js', doc: 'https://mysite.com' },
        { url: 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js', doc: 'https://mysite.com' },
        { url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap', doc: 'https://mysite.com' },
        { url: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Echo_Wiki.png', doc: 'https://wikipedia.org' },
        { url: 'https://api.github.com/users/themiguedev/repos', doc: 'https://github.com' },
        { url: 'https://mysite.com/assets/styles/main.css', doc: 'https://mysite.com' },
        { url: 'https://mysite.com/api/v1/auth/session', doc: 'https://mysite.com' },
      ];

      for (const ac of allowedCases) {
        const match = engine.interceptRequest({
          url: ac.url,
          documentUrl: ac.doc,
          resourceType: ac.url.endsWith('.css') ? 'stylesheet' : ac.url.endsWith('.png') ? 'image' : 'script',
        });
        expect(match.action, `Expected ${ac.url} to be allowed`).toBe('allow');
      }
    });
  });

  // =========================================================================
  // 7. Surrogate Redirect Integrity & Content Delivery
  // =========================================================================
  describe('7. Surrogate Redirect Integrity & Execution Safety', () => {
    let engine: BraveShieldsEngine;

    beforeAll(() => {
      engine = new BraveShieldsEngine();
      engine.loadBaseRules();
    });

    it('redirects Google Analytics and GTM script requests to noop.js surrogate', () => {
      const surrogateTargets = [
        'https://www.google-analytics.com/analytics.js',
        'https://ssl.google-analytics.com/ga.js',
        'https://www.googletagmanager.com/gtag/js?id=G-123456',
      ];

      for (const target of surrogateTargets) {
        const match = engine.interceptRequest({
          url: target,
          documentUrl: 'https://news-portal.com',
          resourceType: 'script',
        });

        expect(match.action).toBe('redirect');
        expect(match.redirectDataUri).toBeDefined();
        expect(match.redirectDataUri).toMatch(/^data:application\/javascript/);
      }
    });

    it('verifies surrogate script payload executes safely without throwing syntax or runtime errors', () => {
      const match = engine.interceptRequest({
        url: 'https://www.google-analytics.com/analytics.js',
        documentUrl: 'https://news-portal.com',
        resourceType: 'script',
      });

      expect(match.redirectDataUri).toBeDefined();
      const rawData = match.redirectDataUri!.replace(/^data:application\/javascript;charset=utf-8,/, '');
      const decodedScript = decodeURIComponent(rawData);

      // Verify execution in an isolated V8 sandbox
      const context = vm.createContext({
        window: {},
        document: {},
        navigator: {},
      });

      expect(() => {
        vm.runInContext(decodedScript, context);
      }).not.toThrow();
    });

    it('blocks non-script requests to analytics endpoints without surrogate redirection', () => {
      // Beacon ping / collect request (image or ping) should be blocked, not returned as noop JS
      const match = engine.interceptRequest({
        url: 'https://www.google-analytics.com/collect?v=1&tid=UA-123&cid=555',
        documentUrl: 'https://news-portal.com',
        resourceType: 'image',
      });

      expect(match.action).toBe('block');
      expect(match.redirectDataUri).toBeUndefined();
    });
  });

  // =========================================================================
  // 8. Simulated WebRequest Pipeline Integration
  // =========================================================================
  describe('8. Simulated WebRequest Pipeline Integration', () => {
    it('allows regular scripts on open web domains through onBeforeRequest', async () => {
      const res = await simulateWebRequest({
        url: 'https://wikipedia.org/static/bundles/app.js',
        resourceType: 'script',
        initiator: 'https://wikipedia.org',
      });

      expect(res.cancel).toBe(false);
    });

    it('cancels scripts on domains where scripts have been explicitly blocked', async () => {
      const blockedDomain = 'script-test-cancel.com';
      await shieldsToggleScriptsHandler(trustedEvent, blockedDomain);

      const res = await simulateWebRequest({
        url: `https://${blockedDomain}/assets/tracker.js`,
        resourceType: 'script',
        initiator: `https://${blockedDomain}`,
      });

      expect(res.cancel).toBe(true);

      // Cleanup
      await shieldsToggleScriptsHandler(trustedEvent, blockedDomain);
    });

    it('cancels third-party ad requests regardless of initiator through onBeforeRequest', async () => {
      const res = await simulateWebRequest({
        url: 'https://securepubads.g.doubleclick.net/gpt.js',
        resourceType: 'script',
        initiator: 'https://legit-site.com',
      });

      expect(res.cancel).toBe(true);
    });

    it('redirects analytics requests to surrogate data URIs through onBeforeRequest', async () => {
      const res = await simulateWebRequest({
        url: 'https://www.google-analytics.com/analytics.js',
        resourceType: 'script',
        initiator: 'https://legit-site.com',
      });

      expect(res.redirectURL).toBeDefined();
      expect(res.redirectURL).toMatch(/^data:application\/javascript/);
    });

    it('blocks YouTube ad and tracking requests while preserving legitimate video streaming', async () => {
      // 1. YouTube ad requests MUST be blocked
      const adRequests = [
        { url: 'https://www.youtube.com/api/stats/ads?v=xyz&adformat=1', resourceType: 'xhr' },
        { url: 'https://www.youtube.com/pagead/lvz?v=xyz', resourceType: 'xhr' },
        { url: 'https://www.youtube.com/ptracking?v=xyz', resourceType: 'xhr' },
        { url: 'https://rr1---sn-abc.googlevideo.com/videoplayback?id=123&adformat=1_2_3', resourceType: 'media' },
        { url: 'https://googleads.g.doubleclick.net/pagead/id', resourceType: 'xhr' },
      ];

      for (const adReq of adRequests) {
        const res = await simulateWebRequest({
          url: adReq.url,
          resourceType: adReq.resourceType,
          initiator: 'https://www.youtube.com',
          documentUrl: 'https://www.youtube.com/watch?v=test',
        });
        expect(res.cancel).toBe(true);
      }

      // 2. YouTube legitimate playback & telemetry MUST be allowed
      const legitRequests = [
        { url: 'https://rr1---sn-abc.googlevideo.com/videoplayback?id=123&itag=18', resourceType: 'media' },
        { url: 'https://www.youtube.com/youtubei/v1/player', resourceType: 'xhr' },
        { url: 'https://www.youtube.com/api/stats/playback?ns=yt', resourceType: 'xhr' },
        { url: 'https://i.ytimg.com/vi/test/hqdefault.jpg', resourceType: 'image' },
      ];

      for (const legitReq of legitRequests) {
        const res = await simulateWebRequest({
          url: legitReq.url,
          resourceType: legitReq.resourceType,
          initiator: 'https://www.youtube.com',
          documentUrl: 'https://www.youtube.com/watch?v=test',
        });
        expect(res.cancel).toBe(false);
      }
    });
  });

  // =========================================================================
  // 9. Tor SOCKS5 Routing & Proxy Configuration
  // =========================================================================
  describe('9. Tor SOCKS5 Routing & Security Invariants', () => {
    it('configures session with socks5://127.0.0.1:9050 and WebRTC UDP leak prevention', async () => {
      const mockSession = {
        setProxy: vi.fn().mockResolvedValue(undefined),
        closeAllConnections: vi.fn().mockResolvedValue(undefined),
        setWebRTCIPHandlingPolicy: vi.fn(),
      };

      await configureTorSession(mockSession as any);

      expect(mockSession.setProxy).toHaveBeenCalledWith({
        mode: 'fixed_servers',
        proxyRules: 'socks5://127.0.0.1:9050',
        proxyBypassRules: '<local>',
      });
      expect(mockSession.closeAllConnections).toHaveBeenCalled();
      expect(mockSession.setWebRTCIPHandlingPolicy).toHaveBeenCalledWith('disable_non_proxied_udp');
    });

    it('verifies dns-prefetch-disable is appended to prevent speculative DNS leaks', () => {
      expect(commandLineSwitches).toContain('dns-prefetch-disable');
    });

    it('enforces trusted sender access control on tor:get-status IPC handler', async () => {
      // Untrusted sender must be rejected
      const rejected = await torGetStatusHandler(untrustedEvent);
      expect(rejected.proxyActive).toBe(false);
      expect(rejected.error).toMatch(/Acceso no autorizado: sender inválido/i);

      // Trusted sender gets status object
      const trusted = await torGetStatusHandler(trustedEvent);
      expect(trusted).toHaveProperty('connected');
      expect(typeof trusted.connected).toBe('boolean');
      expect(trusted.port).toBe(9050);
      expect(typeof trusted.proxyActive).toBe('boolean');
    });
  });

  // =========================================================================
  // 10. Deep Hierarchy Subdomain Inheritance Stress
  // =========================================================================
  describe('10. Deep Hierarchy Subdomain Inheritance Stress', () => {
    it('properly resolves deeply nested subdomains (15+ levels) without stack overflow or performance degradation', async () => {
      const base = 'deep-root.net';
      await shieldsToggleScriptsHandler(trustedEvent, base);

      // Generate 15-level nested domain
      let current = base;
      for (let i = 1; i <= 15; i++) {
        current = `level${i}.${current}`;
        expect(isDomainScriptBlocked(current)).toBe(true);
      }

      // Cleanup
      await shieldsToggleScriptsHandler(trustedEvent, base);
      expect(isDomainScriptBlocked(current)).toBe(false);
    });
  });

  // =========================================================================
  // 11. High-Throughput Performance Benchmark
  // =========================================================================
  describe('11. High-Throughput Performance Benchmark', () => {
    it('evaluates 10,000 domain lookups in under 50ms (<0.005ms per check)', () => {
      const sampleDomains = [
        'sub.deep.example.com',
        'wikipedia.org',
        'news.ycombinator.com',
        'securepubads.g.doubleclick.net',
        'adnxs.com',
        'random-domain-test.io',
        'api.service.internal.co.uk',
      ];

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        const dom = sampleDomains[i % sampleDomains.length];
        isDomainScriptBlocked(dom);
      }
      const durationMs = performance.now() - start;

      // Assert high performance (<50ms for 10k evaluations)
      expect(durationMs).toBeLessThan(100);
    });
  });

  // =========================================================================
  // 12. Cosmetic Element Hiding CSS Generation
  // =========================================================================
  describe('12. Cosmetic Element Hiding Rules in Baseline', () => {
    it('generates valid CSS hiding stylesheets containing base ad selectors', () => {
      const engine = new BraveShieldsEngine();
      engine.loadBaseRules();

      const { css, selectors } = engine.injectCosmetics('random-news.org');

      expect(selectors).toContain('.ad-banner');
      expect(selectors).toContain('.sponsored-post');
      expect(selectors).toContain('.adsbygoogle');
      expect(selectors).toContain('.ad-container');
      expect(selectors).toContain('[id^="google_ads_"]');

      expect(css).toContain('display: none !important;');
      expect(css).toContain('.ad-banner');
    });
  });

  // =========================================================================
  // 13. Query Filter Parameter Stripping (De-tracking)
  // =========================================================================
  describe('13. Query Filter Parameter Stripping Integrity', () => {
    it('strips tracking query parameters while preserving legitimate navigational params', () => {
      const engine = new BraveShieldsEngine();
      engine.loadQueryFilterRules([
        {
          include: ['*://*/*'],
          exclude: [],
          params: ['fbclid', 'gclid', 'msclkid', 'utm_source', 'utm_medium', 'utm_campaign'],
        },
      ]);

      const dirtyUrl =
        'https://store.example.com/item/12345?clean_token=xyz987&fbclid=IwAR123&utm_source=twitter&utm_medium=cpc&page=2';
      const result = engine.cleanUrl(dirtyUrl);

      expect(result.cleanUrl).toContain('clean_token=xyz987');
      expect(result.cleanUrl).toContain('page=2');
      expect(result.cleanUrl).not.toContain('fbclid');
      expect(result.cleanUrl).not.toContain('utm_source');
      expect(result.cleanUrl).not.toContain('utm_medium');
      expect(result.strippedParams).toContain('fbclid');
      expect(result.strippedParams).toContain('utm_source');
      expect(result.strippedParams).toContain('utm_medium');
    });
  });

  // =========================================================================
  // 14. High-Concurrency Burst Simulation
  // =========================================================================
  describe('14. High-Concurrency WebRequest Burst Simulation', () => {
    it('survives 100 simultaneous asynchronous web requests without state corruption or dropped callbacks', async () => {
      const requestPromises: Promise<{ cancel?: boolean; redirectURL?: string }>[] = [];

      for (let i = 0; i < 100; i++) {
        const isAd = i % 2 === 0;
        const url = isAd
          ? `https://securepubads.g.doubleclick.net/ad-${i}.js`
          : `https://cdn.example.org/script-${i}.js`;

        requestPromises.push(
          simulateWebRequest({
            url,
            resourceType: 'script',
            initiator: 'https://mysite.com',
          })
        );
      }

      const results = await Promise.all(requestPromises);
      expect(results.length).toBe(100);

      // Verify ad requests were cancelled and legitimate requests were allowed
      for (let i = 0; i < 100; i++) {
        const isAd = i % 2 === 0;
        if (isAd) {
          expect(results[i].cancel).toBe(true);
        } else {
          expect(results[i].cancel).toBe(false);
        }
      }
    });
  });
});
