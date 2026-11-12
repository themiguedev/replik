import { describe, expect, it } from 'vitest';
import { BraveShieldsEngine } from '../src/shields-engine.js';
import { RuleParser } from '../src/rule-parser.js';
import { CosmeticFilterEngine } from '../src/cosmetic-filter.js';
import { NetworkMatcher } from '../src/network-matcher.js';
import { QueryStripper } from '../src/query-stripper.js';
import { ResourceCatalog } from '../src/resource-catalog.js';

describe('Brave Shields Engine Extended Coverage & Edge-Case Suite', () => {
  describe('RuleParser Edge Cases & Robustness', () => {
    it('ignores comments, empty lines and adblock header metadata correctly', () => {
      expect(RuleParser.parse('')).toBeNull();
      expect(RuleParser.parse('   ')).toBeNull();
      expect(RuleParser.parse('! This is a comment')).toBeNull();
      expect(RuleParser.parse('[Adblock Plus 2.0]')).toBeNull();
      expect(RuleParser.parse('! Checksum: 12345')).toBeNull();
    });

    it('parses malformed lines gracefully without throwing', () => {
      expect(RuleParser.parse('##')).toBeNull();
      expect(RuleParser.parse('#@#')).toBeNull();
      expect(RuleParser.parse('$$')).toBeNull();
      expect(RuleParser.parse('||')).not.toBeNull();
    });

    it('handles scriptlet with complex parameters', () => {
      const rule = RuleParser.parse('example.com##+js(set, window.__adblock, false)');
      expect(rule).not.toBeNull();
      if (rule && 'scriptletName' in rule) {
        expect(rule.scriptletName).toBe('set');
        expect(rule.args).toEqual(['window.__adblock', 'false']);
        expect(rule.domains.has('example.com')).toBe(true);
      }
    });

    it('handles scriptlet with commas inside quoted arguments', () => {
      const rule = RuleParser.parse('example.com##+js(set, key, "val,with,comma")');
      expect(rule).not.toBeNull();
      if (rule && 'scriptletName' in rule) {
        expect(rule.scriptletName).toBe('set');
        expect(rule.args).toEqual(['key', 'val,with,comma']);
        expect(rule.domains.has('example.com')).toBe(true);
      }
    });

    it('parses cosmetic rules with domain negation (~domain)', () => {
      const rule = RuleParser.parse('~whitelisted.com,example.com##.ad-banner');
      expect(rule).not.toBeNull();
      if (rule && 'selector' in rule) {
        expect(rule.domains.has('example.com')).toBe(true);
        expect(rule.domains.has('~whitelisted.com')).toBe(true);
        expect(rule.selector).toBe('.ad-banner');
      }
    });

    it('parses network rules with wildcards and anchored endpoints', () => {
      const rule = RuleParser.parse('||ads.example.com/banner*size=300x250$image');
      expect(rule).not.toBeNull();
      if (rule && 'regex' in rule) {
        expect(rule.regex.test('https://ads.example.com/banner123?size=300x250')).toBe(true);
        expect(rule.regex.test('https://ads.example.com/other')).toBe(false);
        expect(rule.resourceTypes?.has('image')).toBe(true);
      }
    });

    it('parses network rules with domain constraints ($domain=example.com|~news.com)', () => {
      const rule = RuleParser.parse('||tracker.com^$domain=example.com|~news.com');
      expect(rule).not.toBeNull();
      if (rule && 'regex' in rule) {
        expect(rule.domains?.included.has('example.com')).toBe(true);
        expect(rule.domains?.excluded.has('news.com')).toBe(true);
      }
    });

    it('parses network rules with destination domain constraints ($to=target.com)', () => {
      const rule = RuleParser.parse('/ad-beacon/*$to=partner.net');
      expect(rule).not.toBeNull();
      if (rule && 'regex' in rule) {
        expect(rule.toDomains?.included.has('partner.net')).toBe(true);
      }
    });
  });

  describe('NetworkMatcher Advanced Scenarios', () => {
    it('applies domain exclusion constraints properly', () => {
      const matcher = new NetworkMatcher();
      const rule = RuleParser.parse('||telemetry.io^$domain=site-a.com|~safe-site.com');
      if (rule && 'regex' in rule) matcher.addRule(rule);

      // On site-a.com -> blocked
      const resSiteA = matcher.match({
        url: 'https://telemetry.io/event',
        documentUrl: 'https://site-a.com/page',
      });
      expect(resSiteA.action).toBe('block');

      // On safe-site.com -> allowed
      const resSafe = matcher.match({
        url: 'https://telemetry.io/event',
        documentUrl: 'https://safe-site.com/page',
      });
      expect(resSafe.action).toBe('allow');

      // On other non-included site -> allowed
      const resOther = matcher.match({
        url: 'https://telemetry.io/event',
        documentUrl: 'https://other-site.com/page',
      });
      expect(resOther.action).toBe('allow');
    });

    it('verifies resourceType filtering (script, image, stylesheet, subdocument, xmlhttprequest)', () => {
      const matcher = new NetworkMatcher();
      const rule = RuleParser.parse('||multimedia-ads.com^$image,stylesheet');
      if (rule && 'regex' in rule) matcher.addRule(rule);

      // Matching image
      expect(
        matcher.match({
          url: 'https://multimedia-ads.com/img.png',
          resourceType: 'image',
        }).action
      ).toBe('block');

      // Matching stylesheet
      expect(
        matcher.match({
          url: 'https://multimedia-ads.com/style.css',
          resourceType: 'stylesheet',
        }).action
      ).toBe('block');

      // Non-matching script -> allowed
      expect(
        matcher.match({
          url: 'https://multimedia-ads.com/script.js',
          resourceType: 'script',
        }).action
      ).toBe('allow');
    });

    it('distinguishes first-party vs third-party with eTLD+1 logic', () => {
      const matcher = new NetworkMatcher();
      const rule3p = RuleParser.parse('||cdn-tracker.net^$third-party');
      const rule1p = RuleParser.parse('||firstparty-metrics.com^$first-party');
      if (rule3p && 'regex' in rule3p) matcher.addRule(rule3p);
      if (rule1p && 'regex' in rule1p) matcher.addRule(rule1p);

      // Subdomains of the same eTLD+1 should be considered first-party
      const firstPartyRes = matcher.match({
        url: 'https://sub.firstparty-metrics.com/ping',
        documentUrl: 'https://app.firstparty-metrics.com/dashboard',
      });
      expect(firstPartyRes.action).toBe('block');

      // Different domains -> third-party blocked by rule3p
      const thirdPartyRes = matcher.match({
        url: 'https://cdn-tracker.net/collect',
        documentUrl: 'https://random-app.com/index',
      });
      expect(thirdPartyRes.action).toBe('block');
    });

    it('respects exception overrides with specific resource types', () => {
      const matcher = new NetworkMatcher();
      const blockRule = RuleParser.parse('||adcdn.com^$script');
      const exceptRule = RuleParser.parse('@@||adcdn.com/embed.js$script');
      if (blockRule && 'regex' in blockRule) matcher.addRule(blockRule);
      if (exceptRule && 'regex' in exceptRule) matcher.addRule(exceptRule);

      expect(
        matcher.match({
          url: 'https://adcdn.com/banner.js',
          resourceType: 'script',
        }).action
      ).toBe('block');

      expect(
        matcher.match({
          url: 'https://adcdn.com/embed.js',
          resourceType: 'script',
        }).action
      ).toBe('allow');
    });
  });

  describe('ResourceCatalog Surrogates', () => {
    it('supports custom surrogate registration and alias lookup', () => {
      const catalog = new ResourceCatalog();
      catalog.register({
        name: 'custom-tracker.js',
        aliases: ['mock-tracker.js', 'mocktracker'],
        mime: 'application/javascript',
        content: 'window.__trackerLoaded = true;',
      });

      const resByName = catalog.resolve('custom-tracker.js');
      expect(resByName).toBeDefined();
      expect(resByName?.name).toBe('custom-tracker.js');

      const resByAlias = catalog.resolve('mock-tracker.js');
      expect(resByAlias).toBeDefined();
      expect(resByAlias?.name).toBe('custom-tracker.js');

      const dataUri = catalog.toDataUri(resByAlias!);
      expect(dataUri).toContain('data:application/javascript');
      expect(dataUri).toContain(encodeURIComponent('window.__trackerLoaded = true;'));
    });

    it('returns undefined when surrogate does not exist in catalog', () => {
      const catalog = new ResourceCatalog();
      expect(catalog.resolve('non-existent-surrogate.js')).toBeUndefined();
    });
  });

  describe('CosmeticFilterEngine Advanced Cases', () => {
    it('handles multiple domain selectors and domain exceptions (#@#)', () => {
      const engine = new CosmeticFilterEngine();
      engine.addRule({
        raw: 'domain-a.com,domain-b.com##.ad-box',
        domains: new Set(['domain-a.com', 'domain-b.com']),
        selector: '.ad-box',
        isException: false,
      });

      engine.addRule({
        raw: 'domain-b.com#@#.ad-box',
        domains: new Set(['domain-b.com']),
        selector: '.ad-box',
        isException: true,
      });

      // domain-a should include .ad-box
      const selectorsA = engine.getSelectorsForDomain('domain-a.com');
      expect(selectorsA).toContain('.ad-box');

      // domain-b exception unhides .ad-box
      const selectorsB = engine.getSelectorsForDomain('domain-b.com');
      expect(selectorsB).not.toContain('.ad-box');

      // stylesheet generation
      const stylesheetA = engine.generateStylesheet('domain-a.com');
      expect(stylesheetA).toContain('.ad-box {\n  display: none !important;\n}');

      const stylesheetB = engine.generateStylesheet('domain-b.com');
      expect(stylesheetB).toBe('');
    });

    it('respects includeGeneric option in getSelectorsForDomain', () => {
      const engine = new CosmeticFilterEngine();
      engine.addRule({
        raw: '##.generic-ad',
        domains: new Set(),
        selector: '.generic-ad',
        isException: false,
      });

      const withGeneric = engine.getSelectorsForDomain('example.com', { includeGeneric: true });
      expect(withGeneric).toContain('.generic-ad');

      const withoutGeneric = engine.getSelectorsForDomain('example.com', { includeGeneric: false });
      expect(withoutGeneric).not.toContain('.generic-ad');
    });

    it('matches subdomains for cosmetic filters', () => {
      const engine = new CosmeticFilterEngine();
      engine.addRule({
        raw: 'portal.com##.sponsor-post',
        domains: new Set(['portal.com']),
        selector: '.sponsor-post',
        isException: false,
      });

      const selectors = engine.getSelectorsForDomain('sub.portal.com');
      expect(selectors).toContain('.sponsor-post');
    });
  });

  describe('QueryStripper Boundary Cases', () => {
    it('handles invalid or non-HTTP URLs safely without throwing', () => {
      const stripper = new QueryStripper();
      const res = stripper.stripUrl('invalid-url-string');
      expect(res.cleanUrl).toBe('invalid-url-string');
      expect(res.strippedParams).toEqual([]);
    });

    it('strips multiple tracked query parameters (utm_*, gclid, fbclid, msclkid)', () => {
      const stripper = new QueryStripper();
      stripper.addRule({
        name: 'tracking-rule',
        include: ['*://*/*'],
        exclude: [],
        params: ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid', 'msclkid'],
      });

      const testUrl = 'https://shop.com/product?item=42&utm_source=twitter&gclid=xyz123&keep_this=true';
      const result = stripper.stripUrl(testUrl);

      expect(result.strippedParams).toContain('utm_source');
      expect(result.strippedParams).toContain('gclid');
      expect(result.cleanUrl).toContain('item=42');
      expect(result.cleanUrl).toContain('keep_this=true');
      expect(result.cleanUrl).not.toContain('utm_source');
      expect(result.cleanUrl).not.toContain('gclid');
    });

    it('respects domain exclusion in query filter rules', () => {
      const stripper = new QueryStripper();
      stripper.addRule({
        name: 'excluded-domain-rule',
        include: ['*://*/*'],
        exclude: ['*://*.safe-store.com/*'],
        params: ['tracker_id'],
      });

      // safe-store.com matches exclude pattern -> tracker_id not stripped
      const safeRes = stripper.stripUrl('https://app.safe-store.com/checkout?tracker_id=123');
      expect(safeRes.strippedParams).toEqual([]);
      expect(safeRes.cleanUrl).toContain('tracker_id=123');

      // other store -> stripped
      const otherRes = stripper.stripUrl('https://app.other-store.com/checkout?tracker_id=123');
      expect(otherRes.strippedParams).toContain('tracker_id');
      expect(otherRes.cleanUrl).not.toContain('tracker_id');
    });
  });

  describe('BraveShieldsEngine Full Integration & Stats', () => {
    it('aggregates rule statistics correctly across multiple loads', () => {
      const engine = new BraveShieldsEngine();
      const baseCounts = engine.loadBaseRules();
      expect(baseCounts.network).toBeGreaterThan(0);
      expect(baseCounts.cosmetic).toBeGreaterThan(0);

      const extraCounts = engine.loadRulesFromText(`
        ||extra-ad.com^
        customsite.org##.popup
        customsite.org##+js(noop)
      `);
      expect(extraCounts.network).toBe(1);
      expect(extraCounts.cosmetic).toBe(1);
      expect(extraCounts.scriptlets).toBe(1);

      engine.loadQueryFilterRules([
        {
          name: 'extra-query',
          include: ['*://*/*'],
          exclude: [],
          params: ['session_tracker'],
        },
      ]);

      const stats = engine.getStats();
      expect(stats.networkRulesCount).toBeGreaterThan(baseCounts.network);
      expect(stats.cosmeticRulesCount).toBeGreaterThan(baseCounts.cosmetic);
      expect(stats.queryFilterRulesCount).toBe(1);
    });

    it('loads Cookie Notice Blocker rules and blocks consent banners', () => {
      const engine = new BraveShieldsEngine();
      const cookieCounts = engine.loadCookieRules();
      expect(cookieCounts.network).toBeGreaterThan(0);
      expect(cookieCounts.cosmetic).toBeGreaterThan(0);

      // Verify cosmetic cookie banner suppression
      const injected = engine.injectCosmetics('european-site.eu', { includeGeneric: true });
      expect(injected.selectors).toContain('#cookie-banner');
      expect(injected.selectors).toContain('.cookie-banner');
      expect(injected.selectors).toContain('#onetrust-banner-sdk');

      // Verify network blocking of consent managers
      const blockedManager = engine.interceptRequest({
        url: 'https://cdn.onetrust.com/scripttemplates/otSDKStub.js',
        documentUrl: 'https://european-site.eu',
        resourceType: 'script',
      });
      expect(blockedManager.action).toBe('block');
    });

    it('injects cosmetic filters and scriptlets in unison for a target domain', () => {
      const engine = new BraveShieldsEngine();
      engine.loadRulesFromText(`
        target.com##.banner
        target.com##+js(set, adsDisabled, true)
      `);

      const injected = engine.injectCosmetics('target.com');
      expect(injected.selectors).toContain('.banner');
      expect(injected.css).toContain('.banner {\n  display: none !important;\n}');
      expect(injected.scriptlets.length).toBe(1);
      expect(injected.scriptlets[0].scriptletName).toBe('set');
      expect(injected.scriptlets[0].args).toEqual(['adsDisabled', 'true']);
    });
  });
});
