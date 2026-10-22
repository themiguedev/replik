export type ResourceType =
  | 'script'
  | 'image'
  | 'stylesheet'
  | 'xmlhttprequest'
  | 'subdocument'
  | 'websocket'
  | 'media'
  | 'font'
  | 'other';

export interface RequestDetails {
  url: string;
  documentUrl?: string;
  resourceType?: ResourceType;
}

export type FilterAction = 'allow' | 'block' | 'redirect';

export interface MatchResult {
  action: FilterAction;
  rule?: string;
  redirectDataUri?: string;
  reason?: string;
}

export interface DomainConstraints {
  included: Set<string>;
  excluded: Set<string>;
}

export interface NetworkRule {
  raw: string;
  isException: boolean;
  regex: RegExp;
  domains?: DomainConstraints;
  toDomains?: DomainConstraints;
  resourceTypes?: Set<ResourceType>;
  thirdPartyOnly?: boolean;
  firstPartyOnly?: boolean;
  redirectResource?: string;
}

export interface CosmeticRule {
  raw: string;
  isException: boolean;
  domains: Set<string>; // empty means global
  selector: string;
}

export interface ScriptletRule {
  raw: string;
  domains: Set<string>;
  scriptletName: string;
  args: string[];
}

export interface QueryFilterRule {
  include: string[];
  exclude: string[];
  params: string[];
}

export interface SurrogateResource {
  name: string;
  aliases: string[];
  mime: string;
  content: string; // base64 or raw
}
