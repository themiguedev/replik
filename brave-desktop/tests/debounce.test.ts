import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Interfaz representativa de debounce.json
interface DebounceRule {
  include: string[];
  exclude: string[];
  action: "redirect";
  param: string;
}

class DebounceEngine {
  private rules: {
    regexes: RegExp[];
    excludeRegexes: RegExp[];
    param: string;
  }[] = [];

  constructor(rules: DebounceRule[] = []) {
    for (const rule of rules) {
      this.rules.push({
        regexes: rule.include.map((pat) => this.compilePattern(pat)),
        excludeRegexes: rule.exclude.map((pat) => this.compilePattern(pat)),
        param: rule.param,
      });
    }
  }

  public resolveRedirect(urlStr: string): string | null {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      return null;
    }

    for (const rule of this.rules) {
      const matchesInclude = rule.regexes.some((re) => re.test(urlStr));
      if (!matchesInclude) continue;

      const matchesExclude = rule.excludeRegexes.some((re) => re.test(urlStr));
      if (matchesExclude) continue;

      const target = parsed.searchParams.get(rule.param);
      if (target) {
        try {
          const decoded = decodeURIComponent(target);
          if (/^https?:\/\//i.test(decoded)) {
            return decoded;
          }
        } catch {}
      }
    }

    return null;
  }

  private compilePattern(pattern: string): RegExp {
    let regexStr = "^";
    let p = pattern;

    if (p.startsWith("*://*.")) {
      regexStr += "(?:https?|ftp):\\/\\/(?:[a-zA-Z0-9-._]+\\.)?";
      p = p.substring(6);
    } else if (p.startsWith("*://")) {
      regexStr += "(?:https?|ftp):\\/\\/";
      p = p.substring(4);
    }

    for (let i = 0; i < p.length; i++) {
      const c = p[i];
      if (c === "*") {
        regexStr += ".*";
      } else if (".+?^$[{}()|/\\".includes(c)) {
        regexStr += "\\" + c;
      } else {
        regexStr += c;
      }
    }
    regexStr += "$";
    return new RegExp(regexStr, "i");
  }
}

describe("Debounce Engine (Salto Directo de Rastreadores de Rebote)", () => {
  const debounceSampleRules: DebounceRule[] = [
    {
      include: ["*://*.prsm1.com/r?*", "*://cc.zdnet.com/v1/otc/*"],
      exclude: [],
      action: "redirect",
      param: "url",
    },
    {
      include: ["*://t.cfjump.com/*"],
      exclude: [],
      action: "redirect",
      param: "Url",
    },
    {
      include: ["*://r.bttn.io/*"],
      exclude: [],
      action: "redirect",
      param: "btn_url",
    },
    {
      include: ["*://trk.pmsrv.co/v2/trk?*"],
      exclude: [],
      action: "redirect",
      param: "rurl",
    },
  ];

  const engine = new DebounceEngine(debounceSampleRules);

  it('desenvuelve enlaces de rastreo de rebote con parámetro "url"', () => {
    const raw =
      "https://link.prsm1.com/r?url=https%3A%2F%2Ftargetsite.com%2Fdeal&affiliate=123";
    const unwrapped = engine.resolveRedirect(raw);
    expect(unwrapped).toBe("https://targetsite.com/deal");
  });

  it('respeta parámetros case-sensitive como "Url" en t.cfjump.com', () => {
    const raw =
      "https://t.cfjump.com/12345/t/67890?Url=https%3A%2F%2Fmystore.com%2Fshoes";
    const unwrapped = engine.resolveRedirect(raw);
    expect(unwrapped).toBe("https://mystore.com/shoes");
  });

  it('desenvuelve enlaces con nombres de parámetro alternativos ("btn_url", "rurl")', () => {
    const bttn =
      "https://r.bttn.io/click?btn_url=https%3A%2F%2Fmerchant.org%2Fpromo";
    expect(engine.resolveRedirect(bttn)).toBe("https://merchant.org/promo");

    const trk =
      "https://trk.pmsrv.co/v2/trk?rurl=https%3A%2F%2Ffinaldestination.com";
    expect(engine.resolveRedirect(trk)).toBe("https://finaldestination.com");
  });

  it("retorna null para URLs legítimas o que no coinciden con intermediarios de rebote", () => {
    const direct = "https://en.wikipedia.org/wiki/Main_Page";
    expect(engine.resolveRedirect(direct)).toBeNull();
  });

  it("valida con la base de datos oficial debounce.json de Brave si está disponible en disco", () => {
    const officialDebouncePath =
      "D:\\Usuarios\\UCE.FCBA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data\\afalakplffnnnlkncjhbmahjfjhmlkal\\1.0.1562\\1\\debounce.json";

    if (fs.existsSync(officialDebouncePath)) {
      const officialRules: DebounceRule[] = JSON.parse(
        fs.readFileSync(officialDebouncePath, "utf-8"),
      );
      const officialEngine = new DebounceEngine(officialRules);

      // Regla de go.redirectingat.com
      const testBounce =
        "https://go.redirectingat.com/?url=https%3A%2F%2Fclean-site.org%2Farticle";
      const redirected = officialEngine.resolveRedirect(testBounce);
      expect(redirected).toBe("https://clean-site.org/article");
    }
  });
});
