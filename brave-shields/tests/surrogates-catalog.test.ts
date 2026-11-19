import { describe, expect, it } from "vitest";
import { ResourceCatalog } from "../src/resource-catalog.js";

describe("ResourceCatalog & Defuser Surrogates (Mocks de Rastreo)", () => {
  const catalog = new ResourceCatalog();

  it("resuelve los surrogates por nombre canónico", () => {
    expect(catalog.resolve("1x1.gif")).toBeDefined();
    expect(catalog.resolve("noop.js")).toBeDefined();
    expect(catalog.resolve("noop.txt")).toBeDefined();
    expect(catalog.resolve("noop.html")).toBeDefined();
    expect(catalog.resolve("noop.json")).toBeDefined();
  });

  it("resuelve surrogates por aliases sin distinción de mayúsculas y minúsculas", () => {
    const ga = catalog.resolve("google-analytics_analytics.js");
    expect(ga).toBeDefined();
    expect(ga?.name).toBe("noop.js");

    const amazon = catalog.resolve("AMAZON_ADS.JS");
    expect(amazon).toBeDefined();
    expect(amazon?.name).toBe("noop.js");

    const transparent = catalog.resolve("1X1-TRANSPARENT.GIF");
    expect(transparent).toBeDefined();
    expect(transparent?.name).toBe("1x1.gif");
  });

  it("genera Data URIs válidas y no corruptas para imágenes GIF (Base64)", () => {
    const gif = catalog.resolve("1x1.gif")!;
    const dataUri = catalog.toDataUri(gif);

    expect(dataUri.startsWith("data:image/gif;base64,")).toBe(true);
    const base64Content = dataUri.replace("data:image/gif;base64,", "");
    const buffer = Buffer.from(base64Content, "base64");

    // GIF magic header check: GIF87a or GIF89a
    const header = buffer.subarray(0, 6).toString("ascii");
    expect(["GIF87a", "GIF89a"]).toContain(header);
  });

  it("genera Data URIs válidas para JavaScript y JSON ejecutables", () => {
    const js = catalog.resolve("noop.js")!;
    const jsDataUri = catalog.toDataUri(js);
    expect(
      jsDataUri.startsWith("data:application/javascript;charset=utf-8,"),
    ).toBe(true);

    const json = catalog.resolve("noop.json")!;
    const jsonDataUri = catalog.toDataUri(json);
    expect(jsonDataUri.startsWith("data:application/json;charset=utf-8,")).toBe(
      true,
    );

    // Verify encoded content decodes back to valid JSON
    const decodedJson = decodeURIComponent(
      jsonDataUri.replace("data:application/json;charset=utf-8,", ""),
    );
    expect(() => JSON.parse(decodedJson)).not.toThrow();
    expect(JSON.parse(decodedJson)).toEqual({});
  });

  it("permite registrar dinámicamente nuevos defusers y scriptlets uBlock/Brave", () => {
    catalog.register({
      name: "googletagmanager_gtm.js",
      aliases: ["gtm.js", "google-tag-manager.js"],
      mime: "application/javascript",
      content: "window.dataLayer = window.dataLayer || [];",
    });

    const gtm = catalog.resolve("gtm.js");
    expect(gtm).toBeDefined();
    expect(gtm?.name).toBe("googletagmanager_gtm.js");

    const uri = catalog.toDataUri(gtm!);
    expect(uri).toContain(
      encodeURIComponent("window.dataLayer = window.dataLayer || [];"),
    );
  });
});
