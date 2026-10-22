import { CosmeticRule, ScriptletRule } from './types.js';

export class CosmeticFilterEngine {
  private genericHidingRules: CosmeticRule[] = [];
  private domainHidingRules: CosmeticRule[] = [];
  private exceptionRules: CosmeticRule[] = [];
  private scriptlets: ScriptletRule[] = [];

  public addRule(rule: CosmeticRule | ScriptletRule): void {
    if ('scriptletName' in rule) {
      this.scriptlets.push(rule);
      return;
    }

    if (rule.isException) {
      this.exceptionRules.push(rule);
    } else if (rule.domains.size === 0) {
      this.genericHidingRules.push(rule);
    } else {
      this.domainHidingRules.push(rule);
    }
  }

  public addRules(rules: (CosmeticRule | ScriptletRule)[]): void {
    for (const rule of rules) {
      this.addRule(rule);
    }
  }

  public getSelectorsForDomain(
    hostname: string,
    options: { includeGeneric?: boolean } = { includeGeneric: true }
  ): string[] {
    const cleanHost = hostname.toLowerCase();
    const activeSelectors = new Set<string>();
    const unhiddenSelectors = new Set<string>();

    // 1. Gather exceptions for this domain
    for (const rule of this.exceptionRules) {
      if (this.matchesDomain(cleanHost, rule.domains)) {
        unhiddenSelectors.add(rule.selector);
      }
    }

    // 2. Gather domain-specific rules
    for (const rule of this.domainHidingRules) {
      if (this.matchesDomain(cleanHost, rule.domains)) {
        if (!unhiddenSelectors.has(rule.selector)) {
          activeSelectors.add(rule.selector);
        }
      }
    }

    // 3. Gather generic rules if enabled
    if (options.includeGeneric) {
      for (const rule of this.genericHidingRules) {
        if (!unhiddenSelectors.has(rule.selector)) {
          activeSelectors.add(rule.selector);
        }
      }
    }

    return Array.from(activeSelectors);
  }

  public generateStylesheet(
    hostname: string,
    options: { includeGeneric?: boolean } = { includeGeneric: true }
  ): string {
    const selectors = this.getSelectorsForDomain(hostname, options);
    if (selectors.length === 0) {
      return '';
    }

    // Group selectors with display: none !important
    const combined = selectors.join(',\n');
    return `${combined} {\n  display: none !important;\n}`;
  }

  public getScriptletsForDomain(hostname: string): ScriptletRule[] {
    const cleanHost = hostname.toLowerCase();
    return this.scriptlets.filter((rule) => {
      if (rule.domains.size === 0) return true;
      return this.matchesDomain(cleanHost, rule.domains);
    });
  }

  private matchesDomain(targetHost: string, ruleDomains: Set<string>): boolean {
    for (const domain of ruleDomains) {
      if (targetHost === domain || targetHost.endsWith('.' + domain)) {
        return true;
      }
    }
    return false;
  }
}
