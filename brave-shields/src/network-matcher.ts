import { ResourceCatalog } from './resource-catalog.js';
import {
  MatchResult,
  NetworkRule,
  RequestDetails,
  ResourceType,
} from './types.js';

export class NetworkMatcher {
  private exceptions: NetworkRule[] = [];
  private blockers: NetworkRule[] = [];
  private catalog: ResourceCatalog;

  constructor(catalog: ResourceCatalog = new ResourceCatalog()) {
    this.catalog = catalog;
  }

  public addRule(rule: NetworkRule): void {
    if (rule.isException) {
      this.exceptions.push(rule);
    } else {
      this.blockers.push(rule);
    }
  }

  public addRules(rules: NetworkRule[]): void {
    for (const rule of rules) {
      this.addRule(rule);
    }
  }

  public match(details: RequestDetails): MatchResult {
    const requestHost = this.extractHostname(details.url);
    const documentHost = details.documentUrl ? this.extractHostname(details.documentUrl) : undefined;
    const isThirdParty = documentHost ? this.isThirdParty(requestHost, documentHost) : false;

    // 1. Check Exceptions first (highest priority)
    for (const rule of this.exceptions) {
      if (this.evalRule(rule, details, requestHost, documentHost, isThirdParty)) {
        return {
          action: 'allow',
          rule: rule.raw,
          reason: 'Matched exception rule',
        };
      }
    }

    // 2. Check Blocking Rules
    for (const rule of this.blockers) {
      if (this.evalRule(rule, details, requestHost, documentHost, isThirdParty)) {
        if (rule.redirectResource) {
          const surrogate = this.catalog.resolve(rule.redirectResource);
          if (surrogate) {
            return {
              action: 'redirect',
              rule: rule.raw,
              redirectDataUri: this.catalog.toDataUri(surrogate),
              reason: `Redirected to surrogate resource: ${surrogate.name}`,
            };
          }
        }

        return {
          action: 'block',
          rule: rule.raw,
          reason: 'Matched block rule',
        };
      }
    }

    return {
      action: 'allow',
      reason: 'No matching block rules',
    };
  }

  private evalRule(
    rule: NetworkRule,
    details: RequestDetails,
    requestHost: string,
    documentHost: string | undefined,
    isThirdParty: boolean
  ): boolean {
    // Check party constraints
    if (rule.thirdPartyOnly && !isThirdParty) {
      return false;
    }
    if (rule.firstPartyOnly && isThirdParty) {
      return false;
    }

    // Check resource type
    if (rule.resourceTypes && details.resourceType) {
      if (!rule.resourceTypes.has(details.resourceType)) {
        return false;
      }
    }

    // Check document/source domain constraints
    if (rule.domains) {
      const { included, excluded } = rule.domains;
      if (!documentHost && included.size > 0) {
        return false;
      }
      if (documentHost) {
        if (this.domainMatchesAny(documentHost, excluded)) {
          return false;
        }
        if (included.size > 0 && !this.domainMatchesAny(documentHost, included)) {
          return false;
        }
      }
    }

    // Check target domain constraints
    if (rule.toDomains) {
      const { included, excluded } = rule.toDomains;
      if (!requestHost && included.size > 0) {
        return false;
      }
      if (requestHost) {
        if (this.domainMatchesAny(requestHost, excluded)) {
          return false;
        }
        if (included.size > 0 && !this.domainMatchesAny(requestHost, included)) {
          return false;
        }
      }
    }

    // Check URL pattern regex
    return rule.regex.test(details.url);
  }

  private extractHostname(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      return u.hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  private isThirdParty(hostA: string, hostB: string): boolean {
    if (!hostA || !hostB) return false;
    if (hostA === hostB) return false;

    const baseA = this.getBaseDomain(hostA);
    const baseB = this.getBaseDomain(hostB);
    return baseA !== baseB;
  }

  private getBaseDomain(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;
    // Basic eTLD+1 extraction for common suffixes
    return parts.slice(-2).join('.');
  }

  private domainMatchesAny(targetHost: string, domainSet: Set<string>): boolean {
    for (const domain of domainSet) {
      if (domain.includes('*')) {
        const regexStr = '^' + domain.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
        try {
          if (new RegExp(regexStr, 'i').test(targetHost)) return true;
        } catch {
          // ignore invalid regex
        }
      } else if (targetHost === domain || targetHost.endsWith('.' + domain)) {
        return true;
      }
    }
    return false;
  }
}
