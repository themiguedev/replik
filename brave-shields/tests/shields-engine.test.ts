import { describe, expect, it } from 'vitest';
import { BraveShieldsEngine } from '../src/shields-engine.js';
import { RuleParser } from '../src/rule-parser.js';
import { QueryStripper } from '../src/query-stripper.js';

describe('Brave Shields Reconstructed Engine', () => {
  describe('RuleParser', () => {
    it('parses network blocking rules correctly', () => {
      const rule = RuleParser.parse('||doubleclick.net^$third-party,image');
      expect(rule).not.toBeNull();
      if (rule && 'regex' in rule) {
        expect(rule.isException).toBe(false);
        expect(rule.thirdPartyOnly).toBe(true);
        expect(rule.resourceTypes?.has('image')).toBe(true);
        expect(rule.regex.test('https://ad.doubleclick.net/ad.gif')).toBe(true);
        expect(rule.regex.test('https://notdoubleclick.net/')).toBe(false);
      }
    });

    it('parses exception rules correctly', () => {
      const rule = RuleParser.parse('@@||doubleclick.net/safe.js$script');
      expect(rule).not.toBeNull();
      if (rule && 'regex' in rule) {
        expect(rule.isException).toBe(true);
        expect(rule.resourceTypes?.has('script')).toBe(true);
        expect(rule.regex.test('https://doubleclick.net/safe.js')).toBe(true);
      }
    });

    it('parses cosmetic element hiding rules', () => {
      const rule = RuleParser.parse('example.com##.sponsored-banner');
      expect(rule).not.toBeNull();
      if (rule && 'selector' in rule) {
        expect(rule.isException).toBe(false);
        expect(rule.domains.has('example.com')).toBe(true);
        expect(rule.selector).toBe('.sponsored-banner');
      }
    });

    it('parses scriptlet injection rules', () => {
      const rule = RuleParser.parse('youtube.com##+js(set, playerAds, undefined)');
      expect(rule).not.toBeNull();
      if (rule && 'scriptletName' in rule) {
        expect(rule.domains.has('youtube.com')).toBe(true);
        expect(rule.scriptletName).toBe('set');
        expect(rule.args).toEqual(['playerAds', 'undefined']);
      }
    });
  });

  describe('Network Interception & Surrogate Redirection', () => {
    it('blocks matching third-party ad requests', () => {
      const engine = new BraveShieldsEngine();
      engine.loadRulesFromText(`
        ||adserver.com^$third-party
        ||tracker.org^
      `);

      // Third-party ad request -> block
      const res1 = engine.interceptRequest({
        url: 'https://adserver.com/serve.js',
        documentUrl: 'https://mysite.com/home',
        resourceType: 'script',
      });
      expect(res1.action).toBe('block');

      // First-party request to adserver.com when rule specifies third-party -> allow
      const res2 = engine.interceptRequest({
        url: 'https://adserver.com/serve.js',
        documentUrl: 'https://adserver.com/portal',
        resourceType: 'script',
      });
      expect(res2.action).toBe('allow');

      // Unrelated request -> allow
      const res3 = engine.interceptRequest({
        url: 'https://cdn.mysite.com/bundle.js',
        documentUrl: 'https://mysite.com/home',
        resourceType: 'script',
      });
      expect(res3.action).toBe('allow');
    });

    it('honors exceptions over block rules', () => {
      const engine = new BraveShieldsEngine();
      engine.loadRulesFromText(`
        ||analytics.com^
        @@||analytics.com/essential.js
      `);

      const blocked = engine.interceptRequest({
        url: 'https://analytics.com/collect.php',
        documentUrl: 'https://mysite.com',
      });
      expect(blocked.action).toBe('block');

      const allowed = engine.interceptRequest({
        url: 'https://analytics.com/essential.js',
        documentUrl: 'https://mysite.com',
      });
      expect(allowed.action).toBe('allow');
      expect(allowed.reason).toContain('exception');
    });

    it('redirects blocked resources to surrogates (e.g. 1x1.gif)', () => {
      const engine = new BraveShieldsEngine();
      engine.loadRulesFromText(`
        ||tracking-pixel.com/beacon.gif$image,redirect=1x1.gif
      `);

      const res = engine.interceptRequest({
        url: 'https://tracking-pixel.com/beacon.gif',
        documentUrl: 'https://blog.example.com',
        resourceType: 'image',
      });

      expect(res.action).toBe('redirect');
      expect(res.redirectDataUri).toBe(
        'data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
      );
    });
  });

  describe('Cosmetic Filtering (Element Hiding)', () => {
    it('generates injected CSS stylesheet for domain', () => {
      const engine = new BraveShieldsEngine();
      engine.loadRulesFromText(`
        ##.global-ad-slot
        techblog.com##.sponsored-story
        techblog.com###cookie-banner
        otherblog.com##.other-ad
      `);

      const injection = engine.injectCosmetics('techblog.com');
      expect(injection.selectors).toContain('.sponsored-story');
      expect(injection.selectors).toContain('#cookie-banner');
      expect(injection.selectors).toContain('.global-ad-slot');
      expect(injection.selectors).not.toContain('.other-ad');

      expect(injection.css).toContain('.sponsored-story');
      expect(injection.css).toContain('display: none !important;');
    });

    it('respects cosmetic unhiding exceptions (#@#)', () => {
      const engine = new BraveShieldsEngine();
      engine.loadRulesFromText(`
        ##.ad-card
        specialsite.com#@#.ad-card
      `);

      const genericSite = engine.injectCosmetics('regularsite.com');
      expect(genericSite.selectors).toContain('.ad-card');

      const specialSite = engine.injectCosmetics('specialsite.com');
      expect(specialSite.selectors).not.toContain('.ad-card');
    });
  });

  describe('Brave Query Stripping (Tracking Parameter Removal)', () => {
    it('strips global and site-specific tracking parameters while preserving clean queries', () => {
      const stripper = new QueryStripper([
        {
          include: ['*://*/*'],
          exclude: [],
          params: ['fbclid', 'gclid', 'msclkid', 'utm_source', 'utm_medium'],
        },
        {
          include: ['*://*.youtube.com/*', '*://youtu.be/*'],
          exclude: [],
          params: ['si'],
        },
        {
          include: ['*://*.instagram.com/*'],
          exclude: [],
          params: ['igsh', 'igshid'],
        },
      ]);

      // Global marketing click IDs
      const testUrl1 =
        'https://example.com/product?id=123&fbclid=IwAR2xyz&utm_source=newsletter&sort=price';
      const clean1 = stripper.stripUrl(testUrl1);
      expect(clean1.cleanUrl).toBe('https://example.com/product?id=123&sort=price');
      expect(clean1.strippedParams).toContain('fbclid');
      expect(clean1.strippedParams).toContain('utm_source');

      // YouTube tracking ID 'si'
      const testUrl2 = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracking_token_123';
      const clean2 = stripper.stripUrl(testUrl2);
      expect(clean2.cleanUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(clean2.strippedParams).toEqual(['si']);

      // Instagram tracking parameter 'igsh'
      const testUrl3 = 'https://instagram.com/reel/C123456/?igsh=abcde123&hl=en';
      const clean3 = stripper.stripUrl(testUrl3);
      expect(clean3.cleanUrl).toBe('https://instagram.com/reel/C123456/?hl=en');
      expect(clean3.strippedParams).toEqual(['igsh']);
    });
  });

  describe('End-to-End BraveShieldsEngine Integration', () => {
    it('coordinates network, cosmetic, and query cleaning in one unified API', () => {
      const engine = new BraveShieldsEngine();

      // Load sample rules
      engine.loadRulesFromText(`
        ! Sample Brave Shields list
        ||pagead2.googlesyndication.com^$third-party
        ||telemetry.service.com/ping$script,redirect=noop.js
        portal.net##.top-sponsored-banner
      `);

      engine.loadQueryFilterRules([
        {
          include: ['*://*/*'],
          exclude: [],
          params: ['gclid', 'fbclid'],
        },
      ]);

      const stats = engine.getStats();
      expect(stats.networkRulesCount).toBe(2);
      expect(stats.cosmeticRulesCount).toBe(1);
      expect(stats.queryFilterRulesCount).toBe(1);

      // 1. Intercept network request
      const net = engine.interceptRequest({
        url: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        documentUrl: 'https://portal.net/news',
        resourceType: 'script',
      });
      expect(net.action).toBe('block');

      // 2. Surrogate redirect
      const redir = engine.interceptRequest({
        url: 'https://telemetry.service.com/ping',
        documentUrl: 'https://portal.net',
        resourceType: 'script',
      });
      expect(redir.action).toBe('redirect');
      expect(redir.redirectDataUri).toContain('data:application/javascript');

      // 3. Inject CSS
      const cosm = engine.injectCosmetics('portal.net');
      expect(cosm.selectors).toContain('.top-sponsored-banner');
      expect(cosm.css).toContain('.top-sponsored-banner {\n  display: none !important;\n}');

      // 4. Clean URL
      const clean = engine.cleanUrl('https://portal.net/?article=42&gclid=test1234');
      expect(clean.cleanUrl).toBe('https://portal.net/?article=42');
      expect(clean.strippedParams).toEqual(['gclid']);
    });

    it('loads and executes against actual Brave production filter rules from disk', async () => {
      const fs = await import('node:fs');
      const listPath =
        'D:\\Usuarios\\UCE.FCBA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data\\iodkpdagapdfkphljnddpjlldadblomo\\1.0.23118\\list.txt';
      const queryFilterPath =
        'D:\\Usuarios\\UCE.FCBA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data\\cemdlagocoimleflkfkjoihojfainiho\\1.0.191\\query-filter.json';

      if (fs.existsSync(listPath) && fs.existsSync(queryFilterPath)) {
        const engine = new BraveShieldsEngine();

        // Load first 5000 lines of real Brave filter list for fast benchmarking
        const lines = fs.readFileSync(listPath, 'utf-8').split(/\r?\n/).slice(0, 5000).join('\n');
        const counts = engine.loadRulesFromText(lines);
        expect(counts.network + counts.cosmetic + counts.scriptlets).toBeGreaterThan(500);

        // Load actual query filter JSON
        const queryRules = JSON.parse(fs.readFileSync(queryFilterPath, 'utf-8'));
        engine.loadQueryFilterRules(queryRules);

        // Test real YouTube tracking stripping
        const ytClean = engine.cleanUrl(
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=brave_tracking_token'
        );
        expect(ytClean.cleanUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(ytClean.strippedParams).toContain('si');

        // Test real query stripping of global advertising IDs
        const adClean = engine.cleanUrl(
          'https://anydomain.com/landing?product=item1&gclid=12345&fbclid=67890'
        );
        expect(adClean.cleanUrl).toBe('https://anydomain.com/landing?product=item1');
        expect(adClean.strippedParams).toContain('gclid');
        expect(adClean.strippedParams).toContain('fbclid');
      }
    });
  });
});
