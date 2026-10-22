import { SurrogateResource } from './types.js';

export class ResourceCatalog {
  private resourcesByName = new Map<string, SurrogateResource>();
  private resourcesByAlias = new Map<string, SurrogateResource>();

  constructor() {
    this.registerDefaults();
  }

  public register(resource: SurrogateResource): void {
    this.resourcesByName.set(resource.name.toLowerCase(), resource);
    for (const alias of resource.aliases) {
      this.resourcesByAlias.set(alias.toLowerCase(), resource);
    }
  }

  public resolve(nameOrAlias: string): SurrogateResource | undefined {
    const key = nameOrAlias.toLowerCase();
    return this.resourcesByName.get(key) || this.resourcesByAlias.get(key);
  }

  public toDataUri(resource: SurrogateResource): string {
    const isBase64 = resource.mime.startsWith('image/');
    if (isBase64) {
      return `data:${resource.mime};base64,${resource.content}`;
    }
    return `data:${resource.mime};charset=utf-8,${encodeURIComponent(resource.content)}`;
  }

  private registerDefaults(): void {
    this.register({
      name: '1x1.gif',
      aliases: ['1x1-transparent.gif', 'blank-mp3', '2x2.png'],
      mime: 'image/gif',
      content: 'R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
    });

    this.register({
      name: 'noop.js',
      aliases: ['noopjs', 'empty.js', 'google-analytics_analytics.js', 'amazon_ads.js'],
      mime: 'application/javascript',
      content: '/* noop */',
    });

    this.register({
      name: 'noop.txt',
      aliases: ['empty.txt', 'blank.txt'],
      mime: 'text/plain',
      content: '',
    });

    this.register({
      name: 'noop.html',
      aliases: ['empty.html', 'blank.html'],
      mime: 'text/html',
      content: '<!DOCTYPE html><html><head></head><body></body></html>',
    });

    this.register({
      name: 'noop.json',
      aliases: ['empty.json'],
      mime: 'application/json',
      content: '{}',
    });
  }
}
