import {
  CosmeticRule,
  DomainConstraints,
  NetworkRule,
  ResourceType,
  ScriptletRule,
} from './types.js';

export class RuleParser {
  public static parse(line: string): NetworkRule | CosmeticRule | ScriptletRule | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) {
      return null;
    }

    // Check cosmetic or scriptlet rule
    if (trimmed.includes('##') || trimmed.includes('#@#')) {
      return this.parseCosmeticOrScriptlet(trimmed);
    }

    // Otherwise, network rule
    return this.parseNetworkRule(trimmed);
  }

  private static parseCosmeticOrScriptlet(
    raw: string
  ): CosmeticRule | ScriptletRule | null {
    const isException = raw.includes('#@#');
    const separator = isException ? '#@#' : '##';
    const parts = raw.split(separator);
    if (parts.length < 2) return null;

    const domainPart = parts[0].trim();
    const selectorOrScript = parts.slice(1).join(separator).trim();

    const domains = new Set<string>();
    if (domainPart) {
      for (const d of domainPart.split(',')) {
        const clean = d.trim().toLowerCase();
        if (clean) domains.add(clean);
      }
    }

    // Check if scriptlet: starts with +js(...) or script:inject(...)
    if (!isException && selectorOrScript.startsWith('+js(') && selectorOrScript.endsWith(')')) {
      const inner = selectorOrScript.substring(4, selectorOrScript.length - 1);
      const args = inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      const scriptletName = args[0] || '';
      return {
        raw,
        domains,
        scriptletName,
        args: args.slice(1),
      };
    }

    return {
      raw,
      isException,
      domains,
      selector: selectorOrScript,
    };
  }

  private static parseNetworkRule(raw: string): NetworkRule | null {
    let text = raw;
    let isException = false;

    if (text.startsWith('@@')) {
      isException = true;
      text = text.slice(2);
    }

    let pattern = text;
    let optionsPart = '';

    const dollarIdx = text.lastIndexOf('$');
    if (dollarIdx !== -1) {
      pattern = text.substring(0, dollarIdx);
      optionsPart = text.substring(dollarIdx + 1);
    }

    const regex = this.compilePatternToRegex(pattern);
    if (!regex) return null;

    const rule: NetworkRule = {
      raw,
      isException,
      regex,
    };

    if (optionsPart) {
      this.applyOptions(rule, optionsPart);
    }

    return rule;
  }

  private static compilePatternToRegex(pattern: string): RegExp | null {
    if (!pattern) return null;

    // Check if regex literal: /.../
    if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2) {
      try {
        return new RegExp(pattern.slice(1, -1), 'i');
      } catch {
        return null;
      }
    }

    let regexStr = '';
    let i = 0;
    const len = pattern.length;

    // Check for leading ||
    if (pattern.startsWith('||')) {
      regexStr += '^(?:https?|ftp):\\/\\/(?:[a-zA-Z0-9-._]+\\.)?';
      i = 2;
    } else if (pattern.startsWith('|')) {
      regexStr += '^';
      i = 1;
    }

    let endAnchor = false;
    if (pattern.endsWith('|') && !pattern.endsWith('||')) {
      endAnchor = true;
      pattern = pattern.slice(0, -1);
    }

    while (i < pattern.length) {
      const char = pattern[i];
      if (char === '*') {
        regexStr += '.*';
      } else if (char === '^') {
        // Separator character matches non-alphanumeric, separator, or end of string
        regexStr += '(?:[^a-zA-Z0-9_.~%-]|$)';
      } else if ('\\.+?^$[{}()|/'.includes(char)) {
        regexStr += '\\' + char;
      } else {
        regexStr += char;
      }
      i++;
    }

    if (endAnchor) {
      regexStr += '$';
    }

    try {
      return new RegExp(regexStr, 'i');
    } catch {
      return null;
    }
  }

  private static applyOptions(rule: NetworkRule, optionsStr: string): void {
    const opts = optionsStr.split(',');
    for (const opt of opts) {
      const clean = opt.trim().toLowerCase();
      if (!clean) continue;

      if (clean === 'third-party' || clean === '3p') {
        rule.thirdPartyOnly = true;
      } else if (clean === '~third-party' || clean === '1p' || clean === 'first-party') {
        rule.firstPartyOnly = true;
      } else if (clean.startsWith('domain=') || clean.startsWith('from=')) {
        const val = clean.startsWith('domain=') ? clean.substring(7) : clean.substring(5);
        rule.domains = this.parseDomainConstraints(val);
      } else if (clean.startsWith('to=')) {
        rule.toDomains = this.parseDomainConstraints(clean.substring(3));
      } else if (clean.startsWith('redirect=') || clean.startsWith('redirect-rule=')) {
        const val = clean.startsWith('redirect=') ? clean.substring(9) : clean.substring(14);
        rule.redirectResource = val;
      } else if (this.isResourceType(clean)) {
        if (!rule.resourceTypes) rule.resourceTypes = new Set<ResourceType>();
        rule.resourceTypes.add(this.normalizeResourceType(clean));
      }
    }
  }

  private static parseDomainConstraints(domainsStr: string): DomainConstraints {
    const constraints: DomainConstraints = {
      included: new Set<string>(),
      excluded: new Set<string>(),
    };

    const parts = domainsStr.split('|');
    for (const part of parts) {
      const d = part.trim();
      if (!d) continue;
      if (d.startsWith('~')) {
        constraints.excluded.add(d.substring(1).toLowerCase());
      } else {
        constraints.included.add(d.toLowerCase());
      }
    }

    return constraints;
  }

  private static isResourceType(opt: string): boolean {
    const types = [
      'script',
      'image',
      'stylesheet',
      'css',
      'xmlhttprequest',
      'xhr',
      'subdocument',
      'websocket',
      'media',
      'font',
      'other',
    ];
    return types.includes(opt);
  }

  private static normalizeResourceType(opt: string): ResourceType {
    if (opt === 'css') return 'stylesheet';
    if (opt === 'xhr') return 'xmlhttprequest';
    return opt as ResourceType;
  }
}
