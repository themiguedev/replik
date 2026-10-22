import { CosmeticFilterEngine } from './cosmetic-filter.js';
import { NetworkMatcher } from './network-matcher.js';
import { QueryStripper } from './query-stripper.js';
import { ResourceCatalog } from './resource-catalog.js';
import { RuleParser } from './rule-parser.js';
import {
  MatchResult,
  QueryFilterRule,
  RequestDetails,
  ScriptletRule,
} from './types.js';

export interface ShieldStats {
  networkRulesCount: number;
  cosmeticRulesCount: number;
  queryFilterRulesCount: number;
}

export class BraveShieldsEngine {
  private networkMatcher: NetworkMatcher;
  private cosmeticEngine: CosmeticFilterEngine;
  private queryStripper: QueryStripper;
  private resourceCatalog: ResourceCatalog;

  private totalNetworkRules = 0;
  private totalCosmeticRules = 0;
  private totalQueryRules = 0;

  constructor() {
    this.resourceCatalog = new ResourceCatalog();
    this.networkMatcher = new NetworkMatcher(this.resourceCatalog);
    this.cosmeticEngine = new CosmeticFilterEngine();
    this.queryStripper = new QueryStripper();
  }

  public loadRulesFromText(rulesContent: string): {
    network: number;
    cosmetic: number;
    scriptlets: number;
  } {
    const lines = rulesContent.split(/\r?\n/);
    let network = 0;
    let cosmetic = 0;
    let scriptlets = 0;

    for (const line of lines) {
      const parsed = RuleParser.parse(line);
      if (!parsed) continue;

      if ('scriptletName' in parsed) {
        this.cosmeticEngine.addRule(parsed);
        scriptlets++;
      } else if ('selector' in parsed) {
        this.cosmeticEngine.addRule(parsed);
        cosmetic++;
      } else if ('regex' in parsed) {
        this.networkMatcher.addRule(parsed);
        network++;
      }
    }

    this.totalNetworkRules += network;
    this.totalCosmeticRules += cosmetic + scriptlets;

    return { network, cosmetic, scriptlets };
  }

  public loadQueryFilterRules(rules: QueryFilterRule[]): void {
    for (const rule of rules) {
      this.queryStripper.addRule(rule);
      this.totalQueryRules++;
    }
  }

  public interceptRequest(details: RequestDetails): MatchResult {
    return this.networkMatcher.match(details);
  }

  public injectCosmetics(
    hostname: string,
    options?: { includeGeneric?: boolean }
  ): {
    css: string;
    selectors: string[];
    scriptlets: ScriptletRule[];
  } {
    const selectors = this.cosmeticEngine.getSelectorsForDomain(hostname, options);
    const css = this.cosmeticEngine.generateStylesheet(hostname, options);
    const scriptlets = this.cosmeticEngine.getScriptletsForDomain(hostname);

    return { css, selectors, scriptlets };
  }

  public cleanUrl(url: string): { cleanUrl: string; strippedParams: string[] } {
    return this.queryStripper.stripUrl(url);
  }

  public getStats(): ShieldStats {
    return {
      networkRulesCount: this.totalNetworkRules,
      cosmeticRulesCount: this.totalCosmeticRules,
      queryFilterRulesCount: this.totalQueryRules,
    };
  }

  public getCatalog(): ResourceCatalog {
    return this.resourceCatalog;
  }
}
