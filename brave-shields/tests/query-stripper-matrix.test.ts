import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { QueryStripper } from "../src/query-stripper.js";
import { QueryFilterRule } from "../src/types.js";

describe("QueryStripper - Matriz Exhaustiva de De-tracking de URLs Reales", () => {
  const queryFilterPath = path.resolve(
    __dirname,
    "../../brave-desktop/data/query-filter.json",
  );
  const queryRules: QueryFilterRule[] = JSON.parse(
    fs.readFileSync(queryFilterPath, "utf-8"),
  );
  const stripper = new QueryStripper(queryRules);

  describe("Ad-Network Click Identifiers (Globales)", () => {
    it("elimina fbclid, gclid, msclkid, twclid, ttclid manteniendo parámetros legítimos", () => {
      const url =
        "https://example.com/checkout?product_id=42&gclid=TeSt-GCLID-123&quantity=2&fbclid=IwAR0987&category=books&msclkid=MS-999&ttclid=TT-444&twclid=TW-111";
      const result = stripper.stripUrl(url);

      const parsed = new URL(result.cleanUrl);
      expect(parsed.searchParams.get("product_id")).toBe("42");
      expect(parsed.searchParams.get("quantity")).toBe("2");
      expect(parsed.searchParams.get("category")).toBe("books");

      expect(parsed.searchParams.has("gclid")).toBe(false);
      expect(parsed.searchParams.has("fbclid")).toBe(false);
      expect(parsed.searchParams.has("msclkid")).toBe(false);
      expect(parsed.searchParams.has("ttclid")).toBe(false);
      expect(parsed.searchParams.has("twclid")).toBe(false);

      expect(result.strippedParams).toContain("gclid");
      expect(result.strippedParams).toContain("fbclid");
      expect(result.strippedParams).toContain("msclkid");
      expect(result.strippedParams).toContain("ttclid");
      expect(result.strippedParams).toContain("twclid");
    });

    it("elimina parámetros de Google Ads avanzados (dclid, wbraid, srsltid)", () => {
      const url =
        "https://shop.com/item?id=99&dclid=DCLID-VAL&wbraid=WBRAID-VAL&srsltid=SRSLTID-VAL";
      const result = stripper.stripUrl(url);

      const parsed = new URL(result.cleanUrl);
      expect(parsed.searchParams.get("id")).toBe("99");
      expect(parsed.searchParams.has("dclid")).toBe(false);
      expect(parsed.searchParams.has("wbraid")).toBe(false);
      expect(parsed.searchParams.has("srsltid")).toBe(false);
    });

    it("elimina rastreadores de correo masivo y afiliados (mc_eid, _hsenc, irclickid)", () => {
      const url =
        "https://newsletter.org/post?article=hello&mc_eid=mailchimp123&_hsenc=hubspot456&irclickid=impact789";
      const result = stripper.stripUrl(url);

      const parsed = new URL(result.cleanUrl);
      expect(parsed.searchParams.get("article")).toBe("hello");
      expect(parsed.searchParams.has("mc_eid")).toBe(false);
      expect(parsed.searchParams.has("_hsenc")).toBe(false);
      expect(parsed.searchParams.has("irclickid")).toBe(false);
    });
  });

  describe("Domain-Specific Trackers (Redes Sociales y Video)", () => {
    it("elimina parámetro si en YouTube y youtu.be preservando video ID y timestamp", () => {
      const ytUrl =
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=brave_yt_tracking_token";
      const res1 = stripper.stripUrl(ytUrl);
      const parsed1 = new URL(res1.cleanUrl);
      expect(parsed1.searchParams.get("v")).toBe("dQw4w9WgXcQ");
      expect(parsed1.searchParams.get("t")).toBe("42s");
      expect(parsed1.searchParams.has("si")).toBe(false);
      expect(res1.strippedParams).toEqual(["si"]);

      const shortUrl =
        "https://youtu.be/dQw4w9WgXcQ?si=another_token&feature=shared";
      const res2 = stripper.stripUrl(shortUrl);
      const parsed2 = new URL(res2.cleanUrl);
      expect(parsed2.searchParams.get("feature")).toBe("shared");
      expect(parsed2.searchParams.has("si")).toBe(false);
    });

    it("elimina igsh, igshid y stkn en Instagram preservando subdirectorios y parámetros de idioma", () => {
      const instaUrl =
        "https://www.instagram.com/p/DA12345/?igsh=IGSH_CODE&igshid=IGSHID_VAL&hl=es&stkn=SECRET_TOKEN";
      const res = stripper.stripUrl(instaUrl);
      const parsed = new URL(res.cleanUrl);

      expect(parsed.searchParams.get("hl")).toBe("es");
      expect(parsed.searchParams.has("igsh")).toBe(false);
      expect(parsed.searchParams.has("igshid")).toBe(false);
      expect(parsed.searchParams.has("stkn")).toBe(false);
    });

    it("elimina ref_src y ref_url en Twitter y X.com", () => {
      const xUrl =
        "https://x.com/brave/status/123456789?ref_src=twsrc%5Egoogle&ref_url=https%3A%2F%2Fgoogle.com";
      const res = stripper.stripUrl(xUrl);
      const parsed = new URL(res.cleanUrl);

      expect(parsed.searchParams.has("ref_src")).toBe(false);
      expect(parsed.searchParams.has("ref_url")).toBe(false);
      expect(res.strippedParams).toContain("ref_src");
      expect(res.strippedParams).toContain("ref_url");
    });
  });

  describe("Robustez de Casos Límite y URLs Malformadas", () => {
    it("conserva el hash fragment intacto (#heading-1)", () => {
      const url =
        "https://docs.brave.com/shields?topic=farbling&gclid=abc#architecture";
      const res = stripper.stripUrl(url);

      expect(res.cleanUrl).toContain("#architecture");
      expect(res.cleanUrl).not.toContain("gclid=abc");
    });

    it("maneja URLs sin parámetros de búsqueda sin alterarlas", () => {
      const url = "https://brave.com/about/";
      const res = stripper.stripUrl(url);
      expect(res.cleanUrl).toBe(url);
      expect(res.strippedParams).toEqual([]);
    });

    it("maneja strings no URLs de forma segura sin excepciones", () => {
      const invalid = "not-a-valid-url:::123";
      const res = stripper.stripUrl(invalid);
      expect(res.cleanUrl).toBe(invalid);
      expect(res.strippedParams).toEqual([]);
    });
  });
});
