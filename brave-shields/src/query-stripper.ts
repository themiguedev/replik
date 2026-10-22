import { QueryFilterRule } from './types.js';

interface CompiledQueryRule {
  includeRegexes: RegExp[];
  excludeRegexes: RegExp[];
  params: Set<string>;
}

export class QueryStripper {
  private compiledRules: CompiledQueryRule[] = [];

  constructor(rules: QueryFilterRule[] = []) {
    for (const rule of rules) {
      this.addRule(rule);
    }
  }

  public addRule(rule: QueryFilterRule): void {
    this.compiledRules.push({
      includeRegexes: rule.include.map((p) => this.patternToRegex(p)),
      excludeRegexes: rule.exclude.map((p) => this.patternToRegex(p)),
      params: new Set(rule.params.map((p) => p.toLowerCase())),
    });
  }

  public stripUrl(rawUrl: string): { cleanUrl: string; strippedParams: string[] } {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { cleanUrl: rawUrl, strippedParams: [] };
    }

    const strippedParams: string[] = [];
    const keysToRemove = new Set<string>();

    for (const rule of this.compiledRules) {
      const isIncluded = rule.includeRegexes.some((re) => re.test(rawUrl));
      if (!isIncluded) continue;

      const isExcluded = rule.excludeRegexes.some((re) => re.test(rawUrl));
      if (isExcluded) continue;

      for (const [key] of parsed.searchParams.entries()) {
        const lowerKey = key.toLowerCase();
        if (rule.params.has(lowerKey)) {
          keysToRemove.add(key);
        }
      }
    }

    for (const key of keysToRemove) {
      strippedParams.push(key);
      parsed.searchParams.delete(key);
    }

    return {
      cleanUrl: parsed.toString(),
      strippedParams,
    };
  }

  private patternToRegex(pattern: string): RegExp {
    // If pattern contains *://*.domain.com/*, support matching both domain.com and sub.domain.com
    let regexStr = '^';
    let p = pattern;

    if (p.startsWith('*://*.')) {
      regexStr += '(?:https?|ftp):\\/\\/(?:[a-zA-Z0-9-._]+\\.)?';
      p = p.substring(6);
    } else if (p.startsWith('*://')) {
      regexStr += '(?:https?|ftp):\\/\\/';
      p = p.substring(4);
    }

    for (let i = 0; i < p.length; i++) {
      const c = p[i];
      if (c === '*') {
        regexStr += '.*';
      } else if ('.+?^$[{}()|/\\'.includes(c)) {
        regexStr += '\\' + c;
      } else {
        regexStr += c;
      }
    }
    regexStr += '$';
    return new RegExp(regexStr, 'i');
  }
}
