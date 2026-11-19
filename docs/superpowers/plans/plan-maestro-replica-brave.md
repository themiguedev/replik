# Plan Maestro de Implementación: Réplica 1:1 de Brave Browser (Replik)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar todas las brechas técnicas críticas (P0 y P1) entre Brave Browser oficial (v158.1.100.58) y la réplica educativa Replik (`reconstruction/`), implementando un motor de filtrado de alto rendimiento indexado por trigramas, catálogo completo de 224 surrogates, Farbling v2 nativo a nivel WebIDL en precarga temprana sin condiciones de carrera, cabeceras de privacidad obligatorias (`Sec-GPC: 1` y reducción de `Accept-Language`), física elástica de pestañas con _tab tear-off_, autocompletado en Omnibox con la API de Brave Search, enrutamiento real Tor mediante demonio SOCKS5, protocolo dual IPFS, suspensión de pestañas para optimización de RAM y suite de verificación automatizada sobre CDP.

**Architecture:** Arquitectura desacoplada en TypeScript y Electron v45 con capas de responsabilidad unívocas:

1. `brave-shields`: Motor agnóstico de red de alto rendimiento que reemplaza el matching lineal O(N) por indexación de trigramas y cubetas de dominio (<0.05ms por consulta), unifica la carga de >100,000 reglas desde componentes oficiales, incorpora el catálogo de 224 surrogates de `resources.json`, el motor declarativo de salto de intermediarios de `debounce.json` y la sanitización profunda de `clean-urls.json` y De-AMP.
2. `brave-desktop`: Proceso principal y WebUIs de Electron con aislamiento estricto de límites (`contextIsolation: true`, `sandbox: true`), inyección WebIDL de Farbling v2 en fase `document_start` mediante script de precarga de webview (`webview-preload.cjs`), motor de excepciones de compatibilidad `webcompat-exceptions.json`, interceptor de red para `Sec-GPC: 1` y normalización de `Accept-Language`.
3. Interfaz de usuario Nala: Barra de pestañas con física de resorte y desprendimiento a nueva ventana (_tab tear-off_), Omnibox enriquecido con sugerencias asíncronas de Brave Search, panel Shields v2 con desglose granular de scripts por origen, aceleradores de teclado estándar y sistema de tokens de diseño Nala.
4. Protocolos y privacidad de red: Supervisor del proceso Tor con enrutamiento proxy SOCKS5 (`127.0.0.1:9050`) y aislamiento estricto sin fugas de DNS, junto con resolución dual para esquemas `ipfs://` e `ipns://` (nodo local Kubo vs gateway público).
5. Ciclo de vida y verificación: Optimizador de memoria mediante suspensión de pestañas inactivas y suite de pruebas E2E automatizadas sobre Chrome DevTools Protocol (CDP).

**Tech Stack:** TypeScript 5.x, Node.js 22+, Electron v45, Vitest v5.0.3, esbuild, electron-builder, Chrome DevTools Protocol (CDP).

**Spec:** `D:\Usuarios\UCE.FCBA\.gemini\antigravity\brain\f71e16ed-6a3a-4462-af1c-aacb3b2d1e0d\parity-gap-matrix.md`, `reconstruction/CONTEXTO_PROYECTO.md` y artefactos extraídos de Brave Browser oficial v158.1.100.58.

---

## Global Constraints

- **Entorno de ejecución:** Windows 11 x64, Node.js `>=22.0.0`, Electron v45.0.0.
- **Seguridad y aislamiento:** `contextIsolation: true` y `sandbox: true` en todos los WebViews; eliminación de preloads no autorizados en `will-attach-webview`; el único preload de webview permitido es el script interno verificado `webview-preload.cjs`.
- **Ejecutor de pruebas:** Vitest v5.0.3 configurado con `reconstruction/brave-shields/vitest.config.ts`, detectando todos los archivos `reconstruction/**/*.test.ts`.
- **Compilación y empaquetado:** `npm run brave:build` (`esbuild`) para generar `dist/main.mjs`, y `npm run brave:portable` (`electron-builder`) para el ejecutable portable autónomo.
- **Tolerancia cero a fugas de red:** Las sesiones Tor deben enrutar el 100% de las peticiones TCP y resoluciones de nombres a través de SOCKS5 (`127.0.0.1:9050`); bajo ninguna circunstancia se debe recurrir a conexión directa si el proxy falla (política _fail-closed_).
- **Exactitud MIME de surrogates:** Los 224 surrogates deben retornar cabeceras `Content-Type` idénticas a los recursos reales y cuerpos válidos base64 o UTF-8 sin arrojar excepciones de sintaxis.

---

## Review Focus

1. **Condición de carrera en Farbling v2:** Scripts inline en el `<head>` del DOM capturan o congelan `CanvasRenderingContext2D.prototype.getImageData` antes de que se complete `webContents.executeJavaScript` asíncrono. _Mitigación requerida:_ Inyección obligatoria en fase `document_start` vía `webview-preload.cjs` antes de la evaluación de cualquier script del documento (fijado en Tarea 6).
2. **Fuga de tráfico y DNS en Modo Tor:** Fallo de arranque del demonio SOCKS5 o dirección malformada provocando que Electron navegue por la conexión IP pública del ISP. _Mitigación requerida:_ Fail-closed estricto con pantalla de error diagnóstico en `brave://tor-internals` y bloqueo total de peticiones si SOCKS5 no está disponible (fijado en Tarea 13).
3. **Latencia O(N) catastrófica en el comparador de red con >100k reglas:** Bucle secuencial de expresiones regulares bloqueando el hilo principal de Electron (>50ms por petición). _Mitigación requerida:_ Índice de trigramas y prefijos de dominio que reduzca los candidatos evaluados en más de un 95% (<0.05ms por consulta) (fijado en Tarea 1).
4. **Bucle infinito de redirección en Debounce Engine:** Enlaces circulares o parámetros anidados autorreferenciales en intermediarios de rebote causando congelamiento de navegación. _Mitigación requerida:_ Límite estricto de recursión (profundidad máxima <= 3) y validación de esquema URL absoluto (fijado en Tarea 3).
5. **Fuga de memoria y procesos huérfanos en Tab Tear-off:** Desprendimiento de pestañas arrastradas fuera de la ventana creando nuevas ventanas sin liberar el WebView original ni sus listeners IPC. _Mitigación requerida:_ Destrucción y transferencia atómica del estado de la pestaña con recolección de memoria (fijado en Tarea 9).

---

## Fase 1: High-Performance Shields & Surrogates

### Task 1: Motor de Comparación de Red Indexado por Trigramas (High Capacity & O(1) Candidate Pruning)

**Files:**

- Create: `reconstruction/brave-shields/src/trigram-index.ts`
- Modify: `reconstruction/brave-shields/src/network-matcher.ts`
- Test: `reconstruction/brave-shields/tests/trigram-index.test.ts`

**Interfaces:**

- Consumes: `NetworkRule`, `RequestDetails`, `MatchResult` de `reconstruction/brave-shields/src/types.ts`.
- Produces: Clase `TrigramIndex` exportando:
  - `addRule(rule: NetworkRule): void`
  - `buildIndex(): void`
  - `findCandidates(url: string, domain: string, resourceType?: ResourceType): NetworkRule[]`
  - `NetworkMatcher.match(details: RequestDetails): MatchResult` con búsqueda optimizada vía candidatos de trigrama.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-shields/tests/trigram-index.test.ts
import { describe, expect, it } from "vitest";
import { TrigramIndex } from "../src/trigram-index.js";
import { NetworkRule } from "../src/types.js";

describe("TrigramIndex & High-Capacity Candidate Pruning", () => {
  it("extrae trigramas válidos y poda reglas irrelevantes", () => {
    const index = new TrigramIndex();
    const rule1: NetworkRule = {
      raw: "||doubleclick.net^",
      isException: false,
      regex: /doubleclick\.net/,
    };
    const rule2: NetworkRule = {
      raw: "||google-analytics.com/analytics.js",
      isException: false,
      regex: /google-analytics\.com\/analytics\.js/,
    };
    index.addRule(rule1);
    index.addRule(rule2);
    index.buildIndex();

    const candidates = index.findCandidates(
      "https://ad.doubleclick.net/ad.js",
      "doubleclick.net",
      "script",
    );
    expect(candidates).toContainEqual(rule1);
    expect(candidates).not.toContainEqual(rule2);
  });

  it("procesa 100,000 reglas sintéticas en menos de 100ms por 1,000 consultas", () => {
    const index = new TrigramIndex();
    for (let i = 0; i < 100000; i++) {
      index.addRule({
        raw: `||tracker${i}.example.com^`,
        isException: false,
        regex: new RegExp(`tracker${i}\\.example\\.com`),
      });
    }
    index.buildIndex();

    const start = performance.now();
    for (let j = 0; j < 1000; j++) {
      index.findCandidates(
        `https://tracker${j % 100}.example.com/pixel.png`,
        "example.com",
        "image",
      );
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Promedio <0.1ms por consulta
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-shields/tests/trigram-index.test.ts`
Expected: FAIL con `Cannot find module '../src/trigram-index.js'`

- [ ] **Step 3: Implement `TrigramIndex` y conectar con `NetworkMatcher`**

Implementar en `reconstruction/brave-shields/src/trigram-index.ts` la extracción de secuencias de 3 caracteres de patrones de URL, tabla hash de cubetas (`Map<string, Set<NetworkRule>>`), lista de reglas comodín globales y orden de excepciones `@@` prioritarias. Modificar `NetworkMatcher` en `reconstruction/brave-shields/src/network-matcher.ts` para consultar `findCandidates()` antes de ejecutar las expresiones regulares.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-shields/tests/trigram-index.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-shields/src/trigram-index.ts reconstruction/brave-shields/src/network-matcher.ts reconstruction/brave-shields/tests/trigram-index.test.ts
git commit -m "feat(shields): add trigram index for sub-millisecond candidate pruning on 100k rules"
```

---

### Task 2: Integración Completa del Catálogo de 224 Surrogates (`resources.json`)

**Files:**

- Create: `reconstruction/brave-shields/data/resources.json`
- Modify: `reconstruction/brave-shields/src/resource-catalog.ts`
- Test: `reconstruction/brave-shields/tests/surrogates-catalog.test.ts`

**Interfaces:**

- Consumes: Esquema oficial extraído de Brave `mfddibmblmbccpadfndgakiopmmhebop/1.0.158/resources.json` (`{ name: string, aliases: string[], kind: { mime: string }, content: string }`).
- Produces: `ResourceCatalog` con:
  - `loadCatalog(filePath: string): void`
  - `resolve(nameOrAlias: string): SurrogateResource | undefined`
  - `toDataUri(resource: SurrogateResource): string`
  - Soporte de 224 recursos sustitutos neutros listos para redirección en `onBeforeRequest`.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-shields/tests/surrogates-catalog.test.ts
import { describe, expect, it } from "vitest";
import path from "node:path";
import { ResourceCatalog } from "../src/resource-catalog.js";

describe("ResourceCatalog 224 Official Surrogates Parity", () => {
  const catalog = new ResourceCatalog();
  const catalogPath = path.resolve(__dirname, "../data/resources.json");
  catalog.loadCatalog(catalogPath);

  it("carga al menos 220 surrogates oficiales desde resources.json", () => {
    expect(catalog.getCount()).toBeGreaterThanOrEqual(220);
  });

  it("resuelve mocks críticos de telemetría por nombre y alias con Data URI válida", () => {
    const criticalMocks = [
      "google-analytics_analytics.js",
      "googletagmanager_gtm.js",
      "amazon_ads.js",
      "criteo.js",
      "facebook-sdk.js",
      "chartbeat.js",
    ];

    for (const name of criticalMocks) {
      const res = catalog.resolve(name);
      expect(res, `Falta surrogate para ${name}`).toBeDefined();
      const uri = catalog.toDataUri(res!);
      expect(uri.startsWith("data:")).toBe(true);
      expect(uri.length).toBeGreaterThan(15);
    }
  });

  it("soporta decodificación de scripts uBlock (set, noeval, noopjs)", () => {
    const setScript = catalog.resolve("set.js");
    expect(setScript).toBeDefined();
    expect(setScript?.mime).toBe("application/javascript");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-shields/tests/surrogates-catalog.test.ts`
Expected: FAIL con `catalog.loadCatalog is not a function` o surrogates no encontrados.

- [ ] **Step 3: Implement `loadCatalog` y copiar `resources.json`**

Copiar el archivo oficial de recursos a `reconstruction/brave-shields/data/resources.json`. Modificar `ResourceCatalog` en `reconstruction/brave-shields/src/resource-catalog.ts` para parsear la estructura de array de objetos `{ name, aliases, kind: { mime }, content }`, indexar alias en minúsculas y generar Data URIs automáticas respetando codificación Base64 o texto UTF-8.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-shields/tests/surrogates-catalog.test.ts`
Expected: PASS (todos los tests pasan)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-shields/data/resources.json reconstruction/brave-shields/src/resource-catalog.ts reconstruction/brave-shields/tests/surrogates-catalog.test.ts
git commit -m "feat(shields): load official 224 defuser surrogates catalog from resources.json"
```

---

### Task 3: Motor Declarativo de Desvío de Rastreadores de Rebote (`debounce.json`)

**Files:**

- Create: `reconstruction/brave-shields/src/debounce-engine.ts`
- Create: `reconstruction/brave-shields/data/debounce.json`
- Modify: `reconstruction/brave-desktop/main.ts` (reemplazar chequeos hardcoded en `bypassTrackingRedirects`)
- Test: `reconstruction/brave-shields/tests/debounce-engine.test.ts`

**Interfaces:**

- Consumes: Reglas declarativas oficiales de `debounce.json` (`{ include: string[], exclude: string[], action: string, param: string }`).
- Produces: Clase `DebounceEngine` exportando:
  - `loadRules(rules: DebounceRule[]): void`
  - `loadFromFile(filePath: string): void`
  - `unroll(urlStr: string): { bypassed: boolean; targetUrl: string; ruleMatched?: string }`

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-shields/tests/debounce-engine.test.ts
import { describe, expect, it } from "vitest";
import path from "node:path";
import { DebounceEngine } from "../src/debounce-engine.js";

describe("DebounceEngine Declarative Bounce-Tracking Bypass", () => {
  const engine = new DebounceEngine();
  engine.loadFromFile(path.resolve(__dirname, "../data/debounce.json"));

  it("desvía enlaces de rebote conocidos extrayendo la URL destino limpia", () => {
    const bounceUrl =
      "https://mandrillapp.com/track/click/12345?p=eyJ1cmwiOiJodHRwczovL2V4YW1wbGUuY29tL3Byb2R1Y3QifQ";
    const result = engine.unroll(
      "https://out.reddit.com/?url=https%3A%2F%2Fclean-target.org%2Fpage",
    );
    expect(result.bypassed).toBe(true);
    expect(result.targetUrl).toBe("https://clean-target.org/page");
  });

  it("desempaqueta redirecciones anidadas respetando el límite de profundidad (maxDepth = 3)", () => {
    const nested =
      "https://out.reddit.com/?url=" +
      encodeURIComponent("https://href.li/?https://final-destination.com");
    const result = engine.unroll(nested);
    expect(result.bypassed).toBe(true);
    expect(result.targetUrl).toBe("https://final-destination.com");
  });

  it("no altera URLs legítimas ni entra en bucles infinitos con auto-redirecciones", () => {
    const benign = "https://news.ycombinator.com/item?id=12345";
    const result = engine.unroll(benign);
    expect(result.bypassed).toBe(false);
    expect(result.targetUrl).toBe(benign);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-shields/tests/debounce-engine.test.ts`
Expected: FAIL con `Cannot find module '../src/debounce-engine.js'`

- [ ] **Step 3: Implement `DebounceEngine` e integrar en `main.ts`**

Crear `reconstruction/brave-shields/src/debounce-engine.ts` implementando compilación de patrones glob/regex de `include`/`exclude`, extracción segura del parámetro de destino (`param`), decodificación URL / base64 y tope de recursión a 3 niveles. Extraer `debounce.json` oficial en `reconstruction/brave-shields/data/debounce.json`. En `main.ts`, sustituir las 6 ramas `if` de `bypassTrackingRedirects` por una única llamada a `debounceEngine.unroll(url)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-shields/tests/debounce-engine.test.ts`
Expected: PASS (3 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-shields/src/debounce-engine.ts reconstruction/brave-shields/data/debounce.json reconstruction/brave-shields/tests/debounce-engine.test.ts reconstruction/brave-desktop/main.ts
git commit -m "feat(shields): implement declarative debounce engine covering 40+ redirect intermediaries"
```

---

### Task 4: Limpieza Profunda de URLs por Dominio y Motor De-AMP Canónico (`clean-urls.json`)

**Files:**

- Create: `reconstruction/brave-shields/src/url-cleaner.ts`
- Create: `reconstruction/brave-shields/data/clean-urls.json`
- Modify: `reconstruction/brave-shields/src/query-stripper.ts`
- Test: `reconstruction/brave-shields/tests/url-cleaner.test.ts`

**Interfaces:**

- Consumes: Reglas de `clean-urls.json` (`{ domain: string, pathPatterns?: string[], queryParams: string[] }`) y parámetros de `query-filter.json`.
- Produces: Clase `UrlCleaner` exportando:
  - `loadRules(cleanUrlsRules: any[], queryFilterRules: any[]): void`
  - `clean(url: string): { url: string; stripped: string[] }`
  - `deAmp(url: string): { isAmp: boolean; canonicalUrl: string }`

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-shields/tests/url-cleaner.test.ts
import { describe, expect, it } from "vitest";
import path from "node:path";
import { UrlCleaner } from "../src/url-cleaner.js";

describe("UrlCleaner Deep Parameter Stripping & Canonical De-AMP", () => {
  const cleaner = new UrlCleaner();
  cleaner.loadFromFile(
    path.resolve(__dirname, "../data/clean-urls.json"),
    path.resolve(__dirname, "../../brave-desktop/data/query-filter.json"),
  );

  it("elimina parámetros de rastreo específicos de Facebook (__cft__, __tn__)", () => {
    const fbUrl =
      "https://www.facebook.com/user/posts/1?__cft__[0]=AZX&__tn__=%2CO%2CP-R&clean_param=123";
    const result = cleaner.clean(fbUrl);
    expect(result.stripped).toContain("__cft__[0]");
    expect(result.stripped).toContain("__tn__");
    expect(result.url).toBe(
      "https://www.facebook.com/user/posts/1?clean_param=123",
    );
  });

  it("elimina tokens de afiliado y rastreo de Amazon (ref_, tag)", () => {
    const amzUrl =
      "https://www.amazon.com/dp/B08N5WRWNW?ref_=ast_sto_dp&tag=affiliate-20&th=1";
    const result = cleaner.clean(amzUrl);
    expect(result.stripped).toContain("ref_");
    expect(result.stripped).toContain("tag");
    expect(result.url).toBe("https://www.amazon.com/dp/B08N5WRWNW?th=1");
  });

  it("resuelve URLs canónicas De-AMP en subdominios de editores y Google AMP Cache", () => {
    const ampUrl = "https://amp.cnn.com/cnn/2026/10/24/tech/article/index.html";
    const deAmp = cleaner.deAmp(ampUrl);
    expect(deAmp.isAmp).toBe(true);
    expect(deAmp.canonicalUrl).toBe(
      "https://www.cnn.com/cnn/2026/10/24/tech/article/index.html",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-shields/tests/url-cleaner.test.ts`
Expected: FAIL con `Cannot find module '../src/url-cleaner.js'`

- [ ] **Step 3: Implement `UrlCleaner` y poblar `clean-urls.json`**

Crear `reconstruction/brave-shields/src/url-cleaner.ts`. Importar las reglas de `clean-urls.json` extraídas del componente oficial. Integrar lógica de De-AMP que maneje tanto URLs enrutadas por Google (`google.com/amp/s/...`) como subdominios de editores (`amp.*` -> `www.*`), extrayendo el enlace canónico antes de despachar la petición HTTP.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-shields/tests/url-cleaner.test.ts`
Expected: PASS (3 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-shields/src/url-cleaner.ts reconstruction/brave-shields/data/clean-urls.json reconstruction/brave-shields/tests/url-cleaner.test.ts
git commit -m "feat(shields): add deep clean-urls processor and canonical de-amp engine"
```

---

### Task 5: Cargador de Múltiples Listas de Reglas (>100k Reglas de Producción)

**Files:**

- Modify: `reconstruction/brave-shields/src/shields-engine.ts`
- Modify: `reconstruction/brave-desktop/main.ts`
- Test: `reconstruction/brave-shields/tests/multi-list-loader.test.ts`

**Interfaces:**

- Consumes: Múltiples archivos `list.txt` de los directorios de componentes de Brave (`iodk...`, `kihn...`, `adco...`) o empaquetados en `data/`.
- Produces: `BraveShieldsEngine.loadMultipleRuleFiles(filePaths: string[]): Promise<LoadStats>` con deduplicación y reporte de cobertura total.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-shields/tests/multi-list-loader.test.ts
import { describe, expect, it } from "vitest";
import path from "node:path";
import { BraveShieldsEngine } from "../src/shields-engine.js";

describe("BraveShieldsEngine Multi-Component 100k Rules Loader", () => {
  it("carga concurrentemente listas múltiples y deduplica reglas idénticas", async () => {
    const engine = new BraveShieldsEngine();
    const rulesPath = path.resolve(
      __dirname,
      "../../brave-desktop/data/rules.txt",
    );
    const stats = await engine.loadMultipleRuleFiles([rulesPath, rulesPath]);

    expect(stats.totalRulesLoaded).toBeGreaterThan(15000);
    expect(stats.duplicatesIgnored).toBeGreaterThan(15000); // Deduplicación efectiva
    expect(stats.parseDurationMs).toBeLessThan(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-shields/tests/multi-list-loader.test.ts`
Expected: FAIL con `engine.loadMultipleRuleFiles is not a function`

- [ ] **Step 3: Implement `loadMultipleRuleFiles` en `BraveShieldsEngine`**

Añadir método `loadMultipleRuleFiles` en `reconstruction/brave-shields/src/shields-engine.ts` utilizando lectura en streaming por líneas (`readline`), deduplicación mediante `Set<string>` de hashes de reglas crudas y carga directa al `TrigramIndex` desarrollado en la Tarea 1. Actualizar `main.ts` para escanear y cargar automáticamente las listas oficiales presentes en `User Data` si existen.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-shields/tests/multi-list-loader.test.ts`
Expected: PASS (1 test passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-shields/src/shields-engine.ts reconstruction/brave-desktop/main.ts reconstruction/brave-shields/tests/multi-list-loader.test.ts
git commit -m "feat(shields): support concurrent loading and deduplication of >100k rules from multiple components"
```

---

## Fase 2: Farbling v2 & Privacy Headers

### Task 6: Inyección de Farbling en WebIDL Temprano (`document_start` Preload)

**Files:**

- Create: `reconstruction/brave-desktop/webview-preload.cjs`
- Modify: `reconstruction/brave-desktop/farbling.js`
- Modify: `reconstruction/brave-desktop/main.ts:680-735, 1720-1735`
- Test: `reconstruction/brave-desktop/tests/preload-injection.test.ts`

**Interfaces:**

- Consumes: Objeto de configuración de privacidad inyectado por el proceso principal.
- Produces: `webview-preload.cjs` ejecutándose en contexto aislado a nivel `document_start`, inyectando hooks protegidos de `CanvasRenderingContext2D`, `AudioBuffer`, `WebGLRenderingContext`, `screen`, `navigator` y `document.fonts` antes de cualquier script de la página.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/preload-injection.test.ts
import { describe, expect, it } from "vitest";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

describe("WebIDL Early Farbling Preload (Race-Condition Proof)", () => {
  const farblingSource = fs.readFileSync(
    path.resolve(__dirname, "../farbling.js"),
    "utf-8",
  );

  it("ejecuta los parches de farbling antes de cualquier script inline en el DOM", () => {
    let capturedOriginalMethod = null;
    const sandbox: any = {
      window: {},
      navigator: { hardwareConcurrency: 16, deviceMemory: 16 },
      HTMLCanvasElement: class {
        getContext() {
          return new sandbox.CanvasRenderingContext2D();
        }
        toDataURL() {
          return "data:image/png;base64,CLEAN";
        }
      },
      CanvasRenderingContext2D: class {
        getImageData() {
          return { data: new Uint8ClampedArray(512).fill(128) };
        }
      },
    };
    sandbox.window.CanvasRenderingContext2D = sandbox.CanvasRenderingContext2D;
    sandbox.window.location = { hostname: "tracker-inline-test.com" };

    // 1. Simulación de ejecución en preload (document_start)
    vm.runInNewContext(farblingSource, sandbox);

    // 2. Simulación de script inline en el <head> intentando detectar o leer datos reales
    const inlineScript = `
      const ctx = new CanvasRenderingContext2D();
      const img = ctx.getImageData(0, 0, 10, 10);
      const isPatched = CanvasRenderingContext2D.prototype.getImageData.toString().includes('[native code]');
      ({ firstByte: img.data[0], isPatched });
    `;
    const result = vm.runInNewContext(inlineScript, sandbox);

    expect(result.firstByte).not.toBe(128); // El ruido determinista ha alterado el valor antes del script inline
    expect(result.isPatched).toBe(true); // Ocultación de wrapper [native code]
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/preload-injection.test.ts`
Expected: FAIL si `farbling.js` no emula `[native code]` o si requiere ejecución asíncrona.

- [ ] **Step 3: Implementar `webview-preload.cjs` y robustecer `farbling.js`**

Crear `reconstruction/brave-desktop/webview-preload.cjs`. En `main.ts`, en el evento `will-attach-webview`, configurar explícitamente `webPreferences.preload = path.join(baseDir, 'webview-preload.cjs')` en lugar de borrar la propiedad. En `farbling.js`, sobreescribir `Function.prototype.toString` para las funciones parcheadas devolviendo `function () { [native code] }` y configurar descriptores de propiedad no enumerables y no reconfigurables (`configurable: false`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/preload-injection.test.ts`
Expected: PASS (1 test passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/webview-preload.cjs reconstruction/brave-desktop/farbling.js reconstruction/brave-desktop/main.ts reconstruction/brave-desktop/tests/preload-injection.test.ts
git commit -m "fix(farbling): inject WebIDL farbling at document_start via webview-preload to eliminate inline script race condition"
```

---

### Task 7: Motor de Excepciones de Compatibilidad Web (`webcompat-exceptions.json`)

**Files:**

- Create: `reconstruction/brave-shields/src/webcompat-exceptions.ts`
- Create: `reconstruction/brave-desktop/data/webcompat-exceptions.json`
- Modify: `reconstruction/brave-desktop/farbling.js`
- Modify: `reconstruction/brave-desktop/webview-preload.cjs`
- Test: `reconstruction/brave-desktop/tests/webcompat-exceptions.test.ts`

**Interfaces:**

- Consumes: Componente oficial `webcompat-exceptions.json` (3.9 KB).
- Produces: `WebcompatExceptions` exportando:
  - `loadRules(rules: Record<string, string[]>): void`
  - `getDisabledFarblingFeatures(domain: string): Set<string>`
  - Desactivación selectiva de distorsión en `farbling.js` para dominios que de otro modo fallarían visual o funcionalmente (Google Maps canvas, Figma, WhatsApp).

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/webcompat-exceptions.test.ts
import { describe, expect, it } from "vitest";
import path from "node:path";
import { WebcompatExceptions } from "../../brave-shields/src/webcompat-exceptions.js";

describe("WebcompatExceptions Domain Farbling Exemptions", () => {
  const exceptions = new WebcompatExceptions();
  exceptions.loadFromFile(
    path.resolve(__dirname, "../data/webcompat-exceptions.json"),
  );

  it("exime el Canvas farbling en dominios de mapas (maps.google.com)", () => {
    const disabled = exceptions.getDisabledFarblingFeatures("maps.google.com");
    expect(disabled.has("canvas")).toBe(true);
  });

  it("exime hardwareConcurrency en WhatsApp Web (web.whatsapp.com)", () => {
    const disabled = exceptions.getDisabledFarblingFeatures("web.whatsapp.com");
    expect(disabled.has("hardware-concurrency")).toBe(true);
  });

  it("mantiene todas las protecciones activas en dominios ordinarios sin excepción", () => {
    const disabled = exceptions.getDisabledFarblingFeatures(
      "unknown-tracker-site.com",
    );
    expect(disabled.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/webcompat-exceptions.test.ts`
Expected: FAIL con `Cannot find module '../../brave-shields/src/webcompat-exceptions.js'`

- [ ] **Step 3: Implement `WebcompatExceptions` y conectar con `farbling.js`**

Implementar `reconstruction/brave-shields/src/webcompat-exceptions.ts` con matching eTLD+1 jerárquico. Copiar el archivo extraído a `reconstruction/brave-desktop/data/webcompat-exceptions.json`. Modificar `webview-preload.cjs` para consultar las excepciones del dominio anfitrión y pasar los flags correspondientes a `farbling.js` para omitir parches específicos.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/webcompat-exceptions.test.ts`
Expected: PASS (3 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-shields/src/webcompat-exceptions.ts reconstruction/brave-desktop/data/webcompat-exceptions.json reconstruction/brave-desktop/farbling.js reconstruction/brave-desktop/webview-preload.cjs reconstruction/brave-desktop/tests/webcompat-exceptions.test.ts
git commit -m "feat(farbling): integrate webcompat-exceptions engine for canvas and concurrency exemptions"
```

---

### Task 8: Inyección Global de Cabecera `Sec-GPC: 1` y Reducción de Entropía en `Accept-Language`

**Files:**

- Create: `reconstruction/brave-desktop/src/header-sanitizer.ts`
- Modify: `reconstruction/brave-desktop/main.ts:320-370`
- Test: `reconstruction/brave-desktop/tests/privacy-headers.test.ts`

**Interfaces:**

- Consumes: Cabeceras de solicitud salientes en `session.webRequest.onBeforeSendHeaders`.
- Produces: Función `sanitizeRequestHeaders(headers: Record<string, string | string[]>): Record<string, string | string[]>` que garantiza:
  - Presencia inmutable de `Sec-GPC: 1`.
  - Normalización de cadenas complejas de `Accept-Language` a formato simplificado sin singularización por SO.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/privacy-headers.test.ts
import { describe, expect, it } from "vitest";
import { sanitizeRequestHeaders } from "../src/header-sanitizer.js";

describe("Privacy Headers: Sec-GPC & Accept-Language Reduction", () => {
  it("inyecta obligatoriamente la cabecera Sec-GPC: 1 en toda solicitud", () => {
    const rawHeaders = { "User-Agent": "Mozilla/5.0...", Host: "example.com" };
    const sanitized = sanitizeRequestHeaders(rawHeaders);
    expect(sanitized["Sec-GPC"]).toBe("1");
  });

  it("reduce la entropía de Accept-Language simplificando cadenas complejas", () => {
    const fingerprintableLang =
      "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7,fr-CA;q=0.6";
    const sanitized = sanitizeRequestHeaders({
      "Accept-Language": fingerprintableLang,
    });
    expect(sanitized["Accept-Language"]).toBe("es, en;q=0.5");
  });

  it("preserva cabeceras críticas sin alterar cookies ni autenticación", () => {
    const headers = { Authorization: "Bearer token", Cookie: "session=1" };
    const sanitized = sanitizeRequestHeaders(headers);
    expect(sanitized["Authorization"]).toBe("Bearer token");
    expect(sanitized["Cookie"]).toBe("session=1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/privacy-headers.test.ts`
Expected: FAIL con `Cannot find module '../src/header-sanitizer.js'`

- [ ] **Step 3: Implement `header-sanitizer.ts` y registrar en `main.ts`**

Crear `reconstruction/brave-desktop/src/header-sanitizer.ts` implementando la lógica de saneamiento. En `reconstruction/brave-desktop/main.ts`, registrar `session.defaultSession.webRequest.onBeforeSendHeaders` (y para las sesiones privadas/tor) aplicando `sanitizeRequestHeaders(details.requestHeaders)` y retornando `{ requestHeaders: sanitized }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/privacy-headers.test.ts`
Expected: PASS (3 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/src/header-sanitizer.ts reconstruction/brave-desktop/main.ts reconstruction/brave-desktop/tests/privacy-headers.test.ts
git commit -m "feat(privacy): enforce Sec-GPC: 1 header and reduce Accept-Language fingerprinting entropy"
```

---

## Fase 3: WebUI, Tab Physics & Automation

### Task 9: Física de Pestañas con Animación de Resorte y Desprendimiento (_Tab Tear-off_)

**Files:**

- Create: `reconstruction/brave-desktop/ui/tab-physics.js`
- Modify: `reconstruction/brave-desktop/ui/renderer.js`
- Modify: `reconstruction/brave-desktop/ui/style.css`
- Modify: `reconstruction/brave-desktop/main.ts` (manejador IPC `browser:tear-off-tab`)
- Test: `reconstruction/brave-desktop/tests/tab-strip.test.ts`

**Interfaces:**

- Consumes: Eventos DOM de ratón/puntero (`pointerdown`, `pointermove`, `pointerup`) en `.tab`.
- Produces:
  - Animación elástica continua de reordenamiento con `transform: translateX(...)`.
  - Desprendimiento de pestaña a nueva ventana cuando se arrastra verticalmente fuera de la barra (`deltaY > 60px`).
  - Handler IPC `browser:tear-off-tab` en `main.ts` que abre una nueva `BrowserWindow` posicionada en las coordenadas de pantalla del puntero con la URL y sesión de la pestaña desprendida.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/tab-strip.test.ts
import { describe, expect, it, vi } from "vitest";
import { TabPhysics } from "../ui/tab-physics.js";

describe("TabPhysics Spring Reordering & Window Tear-off", () => {
  it("calcula la nueva posición del índice en desplazamiento horizontal", () => {
    const physics = new TabPhysics({ tabWidth: 200, tabCount: 5 });
    const newIndex = physics.calculateDropIndex(0, 450); // Arrastre 450px a la derecha
    expect(newIndex).toBe(2);
  });

  it("dispara callback de desprendimiento (tear-off) cuando el arrastre vertical supera el umbral", () => {
    const onTearOff = vi.fn();
    const physics = new TabPhysics({
      tabWidth: 200,
      tabCount: 5,
      onTearOff,
      tearOffThreshold: 60,
    });

    physics.handlePointerMove(
      { clientX: 200, clientY: 10, screenX: 500, screenY: 200 },
      "tab-1",
      "https://brave.com",
    );
    physics.handlePointerMove(
      { clientX: 200, clientY: 85, screenX: 500, screenY: 275 },
      "tab-1",
      "https://brave.com",
    );

    expect(onTearOff).toHaveBeenCalledWith({
      tabId: "tab-1",
      url: "https://brave.com",
      screenX: 500,
      screenY: 275,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/tab-strip.test.ts`
Expected: FAIL con `Cannot find module '../ui/tab-physics.js'`

- [ ] **Step 3: Implementar `tab-physics.js`, estilos CSS y handler IPC en `main.ts`**

Crear `reconstruction/brave-desktop/ui/tab-physics.js` gestionando la cinemática de arrastre, cálculo de índices y emisión de tear-off. En `renderer.js`, enlazar los eventos de puntero de cada pestaña con `TabPhysics`. En `main.ts`, registrar `ipcMain.handle('browser:tear-off-tab', ...)` para instanciar la nueva ventana en las coordenadas exactas. En `style.css`, agregar transiciones suaves con curvas bezier de resorte (`cubic-bezier(0.2, 0, 0, 1)`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/tab-strip.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/ui/tab-physics.js reconstruction/brave-desktop/ui/renderer.js reconstruction/brave-desktop/ui/style.css reconstruction/brave-desktop/main.ts reconstruction/brave-desktop/tests/tab-strip.test.ts
git commit -m "feat(ui): implement fluid spring tab physics and window tear-off on vertical drag"
```

---

### Task 10: Autocompletado en Omnibox con API de Brave Search y Atajos de Motor

**Files:**

- Create: `reconstruction/brave-desktop/ui/omnibox-suggest.js`
- Modify: `reconstruction/brave-desktop/ui/renderer.js`
- Modify: `reconstruction/brave-desktop/ui/index.html`
- Modify: `reconstruction/brave-desktop/ui/style.css`
- Test: `reconstruction/brave-desktop/tests/omnibox-suggest.test.ts`

**Interfaces:**

- Consumes: Entrada de texto en `#url-input` y respuesta JSON de la API de sugerencias (`https://search.brave.com/api/suggest?q=...`).
- Produces:
  - Menú desplegable enriquecido combinando sugerencias de Brave Search con marcadores e historial local.
  - Indicadores visuales de seguridad (candado HTTPS, esquema local, advertencia).
  - Atajos de palabra clave: `:b` (Brave), `:g` (Google), `:w` (Wikipedia), `:ddg` (DuckDuckGo).
  - Navegación por teclado (Flechas Arriba/Abajo, Tab, Enter, Escape).

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/omnibox-suggest.test.ts
import { describe, expect, it } from "vitest";
import { OmniboxSuggest } from "../ui/omnibox-suggest.js";

describe("OmniboxSuggest Live Suggestions & Keyword Engines", () => {
  it("detecta prefijos de motor de búsqueda (:w, :g, :b) y reformatea la consulta", () => {
    const suggest = new OmniboxSuggest();
    const parsed = suggest.parseInput(":w Quantum Computing");
    expect(parsed.isKeywordSearch).toBe(true);
    expect(parsed.engineName).toBe("Wikipedia");
    expect(parsed.searchUrl).toContain(
      "wikipedia.org/wiki/Special:Search?search=Quantum+Computing",
    );
  });

  it("mezcla y prioriza sugerencias locales de marcadores e historial sobre sugerencias remotas", () => {
    const suggest = new OmniboxSuggest();
    const localItems = [
      { type: "bookmark", title: "GitHub", url: "https://github.com" },
    ];
    const remoteQueries = ["github trending", "github copilot"];

    const blended = suggest.blendSuggestions("git", localItems, remoteQueries);
    expect(blended[0].type).toBe("bookmark");
    expect(blended[1].type).toBe("search");
    expect(blended[1].title).toBe("github trending");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/omnibox-suggest.test.ts`
Expected: FAIL con `Cannot find module '../ui/omnibox-suggest.js'`

- [ ] **Step 3: Implementar `omnibox-suggest.js` y dropdown en `index.html`**

Crear `reconstruction/brave-desktop/ui/omnibox-suggest.js` con debounce de 150ms, llamada HTTP asíncrona a `https://search.brave.com/api/suggest`, renderizado dinámico en un contenedor `.omnibox-dropdown` bajo la barra de direcciones y control completo de foco y selección mediante flechas del teclado.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/omnibox-suggest.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/ui/omnibox-suggest.js reconstruction/brave-desktop/ui/renderer.js reconstruction/brave-desktop/ui/index.html reconstruction/brave-desktop/ui/style.css reconstruction/brave-desktop/tests/omnibox-suggest.test.ts
git commit -m "feat(ui): add live brave search omnibox autocomplete, keyword shortcuts and keyboard navigation"
```

---

### Task 11: Panel Desplegable Shields v2 con Desglose Granular de Scripts

**Files:**

- Create: `reconstruction/brave-desktop/ui/shields-panel-v2.js`
- Modify: `reconstruction/brave-desktop/ui/index.html`
- Modify: `reconstruction/brave-desktop/ui/style.css`
- Modify: `reconstruction/brave-desktop/main.ts` (registro y reporte de peticiones por pestaña)
- Test: `reconstruction/brave-desktop/tests/shields-v2-panel.test.ts`

**Interfaces:**

- Consumes: IPC `shields:get-site-breakdown` en `main.ts` retornando peticiones bloqueadas por dominio y tipo.
- Produces:
  - Panel flotante TopChrome Shields v2 con selector de modo (Estándar vs Agresivo).
  - Lista desplegable e interactiva de scripts y rastreadores individuales con toggle por recurso.
  - Botón para reportar sitio roto con enlace a `brave://webcompat-reporter`.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/shields-v2-panel.test.ts
import { describe, expect, it } from "vitest";
import { ShieldsPanelV2 } from "../ui/shields-panel-v2.js";

describe("ShieldsPanelV2 Granular Tracker & Script Breakdown", () => {
  it("agrupa recursos bloqueados por dominio anfitrión", () => {
    const panel = new ShieldsPanelV2();
    const blockedRequests = [
      { url: "https://ad.doubleclick.net/pixel.js", type: "script" },
      { url: "https://ad.doubleclick.net/ad.png", type: "image" },
      { url: "https://analytics.google.com/collect", type: "xmlhttprequest" },
    ];
    const grouped = panel.groupBlockedResources(blockedRequests);

    expect(Object.keys(grouped)).toContain("doubleclick.net");
    expect(Object.keys(grouped)).toContain("google.com");
    expect(grouped["doubleclick.net"].length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/shields-v2-panel.test.ts`
Expected: FAIL con `Cannot find module '../ui/shields-panel-v2.js'`

- [ ] **Step 3: Implementar `shields-panel-v2.js` y actualizar IPC en `main.ts`**

Crear `reconstruction/brave-desktop/ui/shields-panel-v2.js`. En `main.ts`, mantener una caché temporal de recursos bloqueados por cada `webContentsId`/dominio. Exponer el handler IPC `shields:get-site-breakdown` y conectar el panel en `index.html` con micro-interruptores para permitir o bloquear scripts individualmente.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/shields-v2-panel.test.ts`
Expected: PASS (1 test passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/ui/shields-panel-v2.js reconstruction/brave-desktop/ui/index.html reconstruction/brave-desktop/ui/style.css reconstruction/brave-desktop/main.ts reconstruction/brave-desktop/tests/shields-v2-panel.test.ts
git commit -m "feat(ui): implement Shields v2 panel with per-site granular script breakdown"
```

---

### Task 12: Aceleradores de Teclado Estándar y Sistema de Tokens de Diseño Nala

**Files:**

- Create: `reconstruction/brave-desktop/ui/nala-tokens.css`
- Create: `reconstruction/brave-desktop/ui/keyboard-shortcuts.js`
- Modify: `reconstruction/brave-desktop/ui/style.css`
- Modify: `reconstruction/brave-desktop/ui/renderer.js`
- Test: `reconstruction/brave-desktop/tests/keyboard-accelerators.test.ts`

**Interfaces:**

- Consumes: Especificación de diseño Nala (`nala.css`, `colors.css`) y tabla completa de atajos de Chromium.
- Produces:
  - Tokens CSS unificados de Nala (colores de superficie, radios de borde, acento `#fb542b`, estados hover/active).
  - Manejador centralizado `KeyboardShortcuts` capturando `Ctrl+T`, `Ctrl+W`, `Ctrl+Shift+T`, `Ctrl+Tab`, `Ctrl+1..9`, `Ctrl+L`, `Ctrl+R`, `Ctrl+Shift+R`, `Ctrl+H`, `Ctrl+J`, `Ctrl+Shift+O`, `Ctrl+Shift+Del`, `Ctrl+F`.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/keyboard-accelerators.test.ts
import { describe, expect, it, vi } from "vitest";
import { KeyboardShortcuts } from "../ui/keyboard-shortcuts.js";

describe("KeyboardShortcuts Accelerator Dispatcher", () => {
  it("despacha la acción correcta para Ctrl+T (nueva pestaña) y Ctrl+W (cerrar pestaña)", () => {
    const actions = {
      newTab: vi.fn(),
      closeTab: vi.fn(),
      focusOmnibox: vi.fn(),
    };
    const shortcuts = new KeyboardShortcuts(actions);

    shortcuts.handleKeyDown({
      ctrlKey: true,
      key: "t",
      preventDefault: vi.fn(),
    } as any);
    expect(actions.newTab).toHaveBeenCalled();

    shortcuts.handleKeyDown({
      ctrlKey: true,
      key: "w",
      preventDefault: vi.fn(),
    } as any);
    expect(actions.closeTab).toHaveBeenCalled();
  });

  it("soporta atajos numéricos Ctrl+1 hasta Ctrl+9 para cambio directo de pestaña", () => {
    const selectTab = vi.fn();
    const shortcuts = new KeyboardShortcuts({ selectTab });

    shortcuts.handleKeyDown({
      ctrlKey: true,
      key: "3",
      preventDefault: vi.fn(),
    } as any);
    expect(selectTab).toHaveBeenCalledWith(2); // 0-based index
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/keyboard-accelerators.test.ts`
Expected: FAIL con `Cannot find module '../ui/keyboard-shortcuts.js'`

- [ ] **Step 3: Implementar `nala-tokens.css` y `keyboard-shortcuts.js`**

Crear `reconstruction/brave-desktop/ui/nala-tokens.css` integrando la paleta oficial y variables CSS. Crear `reconstruction/brave-desktop/ui/keyboard-shortcuts.js` gestionando el mapa de atajos globales y conectarlo en `renderer.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/keyboard-accelerators.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/ui/nala-tokens.css reconstruction/brave-desktop/ui/keyboard-shortcuts.js reconstruction/brave-desktop/ui/style.css reconstruction/brave-desktop/ui/renderer.js reconstruction/brave-desktop/tests/keyboard-accelerators.test.ts
git commit -m "feat(ui): add official Nala design tokens and full suite of keyboard accelerators"
```

---

## Fase 4: Network Protocols & Tor Mode

### Task 13: Supervisor del Demonio Tor y Enrutamiento Proxy SOCKS5 Real

**Files:**

- Create: `reconstruction/brave-desktop/src/tor-service.ts`
- Create: `reconstruction/brave-desktop/ui/tor-internals.html`
- Modify: `reconstruction/brave-desktop/main.ts:540-580`
- Test: `reconstruction/brave-desktop/tests/tor-service.test.ts`

**Interfaces:**

- Consumes: Puerto proxy local SOCKS5 (`127.0.0.1:9050`) o binario Tor configurado.
- Produces: Clase `TorService` exportando:
  - `start(): Promise<{ port: number; status: 'running' | 'external' | 'failed' }>`
  - `stop(): Promise<void>`
  - `getStatus(): TorStatus`
  - Configuración estricta en ventanas Tor: `session.setProxy({ proxyRules: 'socks5://127.0.0.1:9050' })` y resolución remota obligatoria de DNS (sin fugas al ISP ni navegación desprotegida).

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/tor-service.test.ts
import { describe, expect, it } from "vitest";
import { TorService } from "../src/tor-service.js";

describe("TorService SOCKS5 Routing & Circuit Management", () => {
  it("genera la regla de proxy SOCKS5 obligatoria con resolución remota de DNS", () => {
    const service = new TorService({ socksPort: 9050 });
    const proxyConfig = service.getProxyConfig();
    expect(proxyConfig.proxyRules).toBe("socks5://127.0.0.1:9050");
    expect(proxyConfig.proxyBypassRules).toBe("<local>");
  });

  it("reconoce y valida dominios .onion para enrutamiento exclusivo", () => {
    const service = new TorService();
    expect(
      service.isOnionDomain(
        "duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion",
      ),
    ).toBe(true);
    expect(service.isOnionDomain("duckduckgo.com")).toBe(false);
  });

  it("aplica política fail-closed si el servicio SOCKS5 no está accesible", async () => {
    const service = new TorService({ socksPort: 59999 }); // Puerto inexistente
    const status = await service.verifyProxyHealth();
    expect(status.healthy).toBe(false);
    expect(service.shouldBlockTrafficOnFailure()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/tor-service.test.ts`
Expected: FAIL con `Cannot find module '../src/tor-service.js'`

- [ ] **Step 3: Implementar `TorService`, página `tor-internals.html` y configurar sesión en `main.ts`**

Crear `reconstruction/brave-desktop/src/tor-service.ts`. Implementar verificación de puerto SOCKS5 (sonda TCP de handshake) y arranque del proceso si existe binario. En `main.ts`, para cualquier ventana creada con `isTor: true`, asociar una partición de sesión dedicada en memoria (`persist:tor-session` o ephemeral), configurar `session.setProxy()` apuntando al proxy SOCKS5, y deshabilitar cualquier conexión directa si el handshake falla.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/tor-service.test.ts`
Expected: PASS (3 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/src/tor-service.ts reconstruction/brave-desktop/ui/tor-internals.html reconstruction/brave-desktop/main.ts reconstruction/brave-desktop/tests/tor-service.test.ts
git commit -m "feat(tor): implement Tor SOCKS5 proxy routing supervisor with fail-closed onion isolation"
```

---

### Task 14: Manejador de Protocolo Dual IPFS / IPNS (Kubo Local vs Gateway Fallback)

**Files:**

- Create: `reconstruction/brave-desktop/src/ipfs-handler.ts`
- Create: `reconstruction/brave-desktop/ui/ipfs-internals.html`
- Modify: `reconstruction/brave-desktop/main.ts:330-345`
- Test: `reconstruction/brave-desktop/tests/ipfs-handler.test.ts`

**Interfaces:**

- Consumes: Esquemas de URL `ipfs://<cid>` e `ipns://<peerId>`.
- Produces: Clase `IpfsHandler` exportando:
  - `resolve(uri: string): Promise<string>`
  - `checkLocalNodeHealth(): Promise<boolean>`
  - Redirección inteligente: si el demonio Kubo local está activo en `http://127.0.0.1:5001`, resuelve contra `http://127.0.0.1:8080/ipfs/...`; si está inactivo, conmuta transparentemente a gateways públicos (`dweb.link`, `cloudflare-ipfs.com`).

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/ipfs-handler.test.ts
import { describe, expect, it } from "vitest";
import { IpfsHandler } from "../src/ipfs-handler.js";

describe("IpfsHandler Dual Gateway & Local Node Resolution", () => {
  it("resuelve URIs ipfs:// y ipns:// hacia gateway público por defecto", async () => {
    const handler = new IpfsHandler({
      defaultPublicGateway: "https://dweb.link",
    });
    const resolved = await handler.resolve(
      "ipfs://bafybeicysg23kiibikndgahgnw8ebduaackspndgahgnw8ebdua/readme.txt",
    );
    expect(resolved).toBe(
      "https://dweb.link/ipfs/bafybeicysg23kiibikndgahgnw8ebduaackspndgahgnw8ebdua/readme.txt",
    );
  });

  it("conmuta a nodo local cuando Kubo responde positivamente", async () => {
    const handler = new IpfsHandler({
      localGateway: "http://127.0.0.1:8080",
      isLocalActive: true,
    });
    const resolved = await handler.resolve(
      "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/",
    );
    expect(resolved).toBe(
      "http://127.0.0.1:8080/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/ipfs-handler.test.ts`
Expected: FAIL con `Cannot find module '../src/ipfs-handler.js'`

- [ ] **Step 3: Implementar `ipfs-handler.ts` e integrar en `main.ts`**

Crear `reconstruction/brave-desktop/src/ipfs-handler.ts` con chequeo periódico de estado `/api/v0/version`. En `main.ts`, actualizar el interceptor `onBeforeRequest` para delegar la resolución de esquemas `ipfs:` e `ipns:` a `IpfsHandler.resolve()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/ipfs-handler.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/src/ipfs-handler.ts reconstruction/brave-desktop/ui/ipfs-internals.html reconstruction/brave-desktop/main.ts reconstruction/brave-desktop/tests/ipfs-handler.test.ts
git commit -m "feat(ipfs): add dual IPFS/IPNS handler with automatic local node detection and gateway fallback"
```

---

## Fase 5: Verification Loop & Packaging

### Task 15: Suite de Verificación Automatizada sobre Chrome DevTools Protocol (CDP)

**Files:**

- Create: `reconstruction/brave-desktop/tests/cdp-verification.test.ts`
- Create: `reconstruction/brave-desktop/tests/fixtures/synthetic-tracker-page.html`
- Modify: `package.json`
- Test: `reconstruction/brave-desktop/tests/cdp-verification.test.ts`

**Interfaces:**

- Consumes: Conexión WebSocket a puerto de depuración remota de Electron (`--remote-debugging-port=9222`).
- Produces: Test automatizado end-to-end que inicia Replik, abre una página de prueba con rastreadores y canvas, y verifica vía CDP que:
  - Las peticiones de anuncios fueron bloqueadas o sustituidas por surrogates.
  - La cabecera `Sec-GPC: 1` estuvo presente en la solicitud (`Network.requestWillBeSent`).
  - La llamada a `getImageData` en la página retornó píxeles con ruido Farbling y no los valores limpios.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/cdp-verification.test.ts
import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs";

describe("End-to-End CDP Test Suite & Parity Verifier", () => {
  it("existe la página de prueba sintética con rastreadores y canvas test vectors", () => {
    const fixturePath = path.resolve(
      __dirname,
      "fixtures/synthetic-tracker-page.html",
    );
    expect(fs.existsSync(fixturePath)).toBe(true);
    const content = fs.readFileSync(fixturePath, "utf-8");
    expect(content).toContain("doubleclick.net");
    expect(content).toContain("getImageData");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/cdp-verification.test.ts`
Expected: FAIL con `expected false to be true` (fixture inexistente)

- [ ] **Step 3: Crear fixture sintético y runner de verificación CDP**

Crear `reconstruction/brave-desktop/tests/fixtures/synthetic-tracker-page.html` conteniendo scripts de tracking ficticios, peticiones de imagen pixel y llamadas a `canvas.toDataURL()` y `AudioContext`. Implementar el script de prueba en `cdp-verification.test.ts` validando la interceptación correcta de red y la protección activa.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/cdp-verification.test.ts`
Expected: PASS (1 test passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/tests/cdp-verification.test.ts reconstruction/brave-desktop/tests/fixtures/synthetic-tracker-page.html
git commit -m "test(cdp): create automated CDP test runner and synthetic tracker verification fixtures"
```

---

### Task 16: Motor de Suspensión de Pestañas Inactivas para Optimización de Memoria RAM

**Files:**

- Create: `reconstruction/brave-desktop/src/tab-discarder.ts`
- Modify: `reconstruction/brave-desktop/main.ts`
- Modify: `reconstruction/brave-desktop/ui/renderer.js`
- Test: `reconstruction/brave-desktop/tests/tab-discarder.test.ts`

**Interfaces:**

- Consumes: Registro de actividad de pestañas y temporizadores de inactividad.
- Produces: Clase `TabDiscarder` exportando:
  - `recordTabActivity(tabId: string): void`
  - `checkDiscardableTabs(idleThresholdMs: number): string[]`
  - `discardTab(tabId: string): void`
  - `restoreTab(tabId: string): { url: string; scrollPosition?: number }`
  - Reduce el consumo de RAM en reposo de ~280 MB a menos de ~180 MB cuando hay múltiples pestañas en segundo plano.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/tab-discarder.test.ts
import { describe, expect, it } from "vitest";
import { TabDiscarder } from "../src/tab-discarder.js";

describe("TabDiscarder Background Memory Optimization", () => {
  it("marca como suspendibles las pestañas inactivas tras expirar el temporizador", () => {
    const discarder = new TabDiscarder({ idleThresholdMs: 1000 });
    discarder.registerTab("tab-1", "https://example.com/heavy-page");
    discarder.registerTab("tab-2", "https://example.com/active-page");

    // Simular paso del tiempo para tab-1
    discarder.setLastActiveTimeForTest("tab-1", Date.now() - 2000);
    discarder.setLastActiveTimeForTest("tab-2", Date.now());

    const discardable = discarder.checkDiscardableTabs();
    expect(discardable).toContain("tab-1");
    expect(discardable).not.toContain("tab-2");
  });

  it("retiene el título, URL y estado de navegación tras suspender para restauración transparente", () => {
    const discarder = new TabDiscarder();
    discarder.registerTab(
      "tab-1",
      "https://news.ycombinator.com",
      "Hacker News",
    );
    discarder.discardTab("tab-1");

    expect(discarder.isDiscarded("tab-1")).toBe(true);
    const restored = discarder.restoreTab("tab-1");
    expect(restored.url).toBe("https://news.ycombinator.com");
    expect(restored.title).toBe("Hacker News");
    expect(discarder.isDiscarded("tab-1")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/tab-discarder.test.ts`
Expected: FAIL con `Cannot find module '../src/tab-discarder.js'`

- [ ] **Step 3: Implementar `TabDiscarder` y conectar con la barra de pestañas**

Crear `reconstruction/brave-desktop/src/tab-discarder.ts`. En `renderer.js` y `main.ts`, cuando una pestaña esté inactiva por más de 15 minutos, desacoplar el elemento `<webview>` conservando su chip visual en la barra de pestañas; al hacer clic nuevamente en la pestaña, reinstanciar el webview con la URL guardada sin parpadeo perceptible.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/tab-discarder.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/src/tab-discarder.ts reconstruction/brave-desktop/main.ts reconstruction/brave-desktop/ui/renderer.js reconstruction/brave-desktop/tests/tab-discarder.test.ts
git commit -m "feat(perf): add tab discarder engine for idle tab suspension and memory reduction"
```

---

### Task 17: Empaquetado Portable y Verificación de Integridad de Activos de Datos

**Files:**

- Modify: `reconstruction/brave-desktop/package.json`
- Create: `reconstruction/brave-desktop/tests/packaging-assets.test.ts`
- Test: `reconstruction/brave-desktop/tests/packaging-assets.test.ts`

**Interfaces:**

- Consumes: Directorio de distribución y archivos de datos en `reconstruction/brave-desktop/data/`.
- Produces:
  - Test de integridad que garantiza que `resources.json`, `debounce.json`, `clean-urls.json`, `webcompat-exceptions.json`, `query-filter.json` y `rules.txt` están empaquetados y validados sintácticamente.
  - Configuración verificada de `electron-builder` en `reconstruction/brave-desktop/package.json` para generar `Brave-Replica-Portable.exe` autónomo sin dependencias externas ausentes.

- [ ] **Step 1: Write the failing test**

```typescript
// reconstruction/brave-desktop/tests/packaging-assets.test.ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Packaging Assets Integrity Verification", () => {
  const dataDir = path.resolve(__dirname, "../data");
  const requiredDataFiles = [
    "query-filter.json",
    "rules.txt",
    "resources.json",
    "debounce.json",
    "clean-urls.json",
    "webcompat-exceptions.json",
  ];

  it("contiene todos los archivos de datos requeridos en la carpeta data/", () => {
    for (const filename of requiredDataFiles) {
      const fullPath = path.join(dataDir, filename);
      expect(
        fs.existsSync(fullPath),
        `Falta archivo crítico: ${filename}`,
      ).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(50); // Archivo no vacío
    }
  });

  it("valida que todos los archivos JSON empaquetados tienen sintaxis válida", () => {
    const jsonFiles = requiredDataFiles.filter((f) => f.endsWith(".json"));
    for (const jsonFile of jsonFiles) {
      const content = fs.readFileSync(path.join(dataDir, jsonFile), "utf-8");
      expect(
        () => JSON.parse(content),
        `JSON corrupto en ${jsonFile}`,
      ).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run reconstruction/brave-desktop/tests/packaging-assets.test.ts`
Expected: FAIL si alguno de los archivos JSON oficiales aún no ha sido copiado a `reconstruction/brave-desktop/data/`.

- [ ] **Step 3: Sincronizar activos y actualizar `package.json` de `brave-desktop`**

Garantizar que todos los archivos JSON extraídos y configurados en las Tareas 1-8 se copien o referencien en `reconstruction/brave-desktop/data/`. En `reconstruction/brave-desktop/package.json`, verificar que la lista `files` incluya `"data/**/*"`, `"dist/**/*"`, `"preload.cjs"`, `"webview-preload.cjs"` y `"ui/**/*"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run reconstruction/brave-desktop/tests/packaging-assets.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit**

```bash
git add reconstruction/brave-desktop/package.json reconstruction/brave-desktop/tests/packaging-assets.test.ts
git commit -m "build(packaging): verify data assets bundling integrity and portable release configuration"
```

---

## Matriz de Cobertura y Criterios de Aceptación para @verifier

| Fase / Tarea          | Brechas Cubiertas                                     | Archivos Clave                                         | Comando de Verificación                                                           | Criterio de Aceptación para @verifier                                                                                  |
| :-------------------- | :---------------------------------------------------- | :----------------------------------------------------- | :-------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Fase 1 / Tarea 1**  | P0 Algoritmo Matching (Trigram Index)                 | `trigram-index.ts`, `network-matcher.ts`               | `npx vitest run reconstruction/brave-shields/tests/trigram-index.test.ts`         | Evaluación sub-milisegundo (<0.05ms) en 100k reglas; poda >95% de reglas irrelevantes sin pérdida de falsos negativos. |
| **Fase 1 / Tarea 2**  | P0 Catálogo Surrogates (`resources.json`)             | `resources.json`, `resource-catalog.ts`                | `npx vitest run reconstruction/brave-shields/tests/surrogates-catalog.test.ts`    | Carga de 224 surrogates con resolución insensible a mayúsculas/minúsculas de alias y Data URIs válidas.                |
| **Fase 1 / Tarea 3**  | P0 Debounce Declarativo (`debounce.json`)             | `debounce-engine.ts`, `debounce.json`, `main.ts`       | `npx vitest run reconstruction/brave-shields/tests/debounce-engine.test.ts`       | Interceptación de >40 servicios de rebote; extracción limpia de URL destino; límite de profundidad <= 3.               |
| **Fase 1 / Tarea 4**  | P1 Clean URLs & P1 De-AMP Canónico                    | `url-cleaner.ts`, `clean-urls.json`                    | `npx vitest run reconstruction/brave-shields/tests/url-cleaner.test.ts`           | Eliminación de tokens específicos de redes sociales y resolución canónica de subdominios AMP.                          |
| **Fase 1 / Tarea 5**  | P0 Capacidad de Reglas (>100k reglas)                 | `shields-engine.ts`, `multi-list-loader.test.ts`       | `npx vitest run reconstruction/brave-shields/tests/multi-list-loader.test.ts`     | Carga en streaming de componentes oficiales concurrentes sin saturar memoria (<60 MB RAM).                             |
| **Fase 2 / Tarea 6**  | P0 Inyección WebIDL Farbling Temprana                 | `webview-preload.cjs`, `farbling.js`                   | `npx vitest run reconstruction/brave-desktop/tests/preload-injection.test.ts`     | Inyección en `document_start`; ausencia de condición de carrera con scripts inline; emulación nativa `[native code]`.  |
| **Fase 2 / Tarea 7**  | P0 Excepciones Farbling (`webcompat-exceptions.json`) | `webcompat-exceptions.ts`, `webcompat-exceptions.json` | `npx vitest run reconstruction/brave-desktop/tests/webcompat-exceptions.test.ts`  | Canvas funcional en Google Maps y Hardware Concurrency en WhatsApp sin desactivar shields globales.                    |
| **Fase 2 / Tarea 8**  | P0 Cabeceras `Sec-GPC` y `Accept-Language`            | `header-sanitizer.ts`, `main.ts`                       | `npx vitest run reconstruction/brave-desktop/tests/privacy-headers.test.ts`       | Inyección del 100% de `Sec-GPC: 1` y normalización de `Accept-Language` a un máximo de 2 tokens de idioma.             |
| **Fase 3 / Tarea 9**  | P0 Física de Pestañas y Tab Tear-off                  | `tab-physics.js`, `renderer.js`, `style.css`           | `npx vitest run reconstruction/brave-desktop/tests/tab-strip.test.ts`             | Reordenamiento animado con resorte; desprendimiento vertical a nueva ventana independiente.                            |
| **Fase 3 / Tarea 10** | P0 Omnibox Autocomplete con Brave Search              | `omnibox-suggest.js`, `renderer.js`                    | `npx vitest run reconstruction/brave-desktop/tests/omnibox-suggest.test.ts`       | Sugerencias asíncronas en vivo (<200ms) mezcladas con historial/marcadores y atajos `:b`, `:g`, `:w`.                  |
| **Fase 3 / Tarea 11** | P0 Shields v2 Flyout con Desglose                     | `shields-panel-v2.js`, `index.html`                    | `npx vitest run reconstruction/brave-desktop/tests/shields-v2-panel.test.ts`      | Desglose por origen de scripts bloqueados con micro-interruptores individuales de permiso.                             |
| **Fase 3 / Tarea 12** | P1 Atajos Teclado y Tokens Nala                       | `nala-tokens.css`, `keyboard-shortcuts.js`             | `npx vitest run reconstruction/brave-desktop/tests/keyboard-accelerators.test.ts` | Captura de 15 aceleradores de teclado estándar y adopción de variables CSS Nala.                                       |
| **Fase 4 / Tarea 13** | P0 Demonio Tor y SOCKS5 Routing                       | `tor-service.ts`, `main.ts`, `tor-internals.html`      | `npx vitest run reconstruction/brave-desktop/tests/tor-service.test.ts`           | Enrutamiento 100% vía `socks5://127.0.0.1:9050`; resolución de dominios `.onion`; fail-closed sin fugas de IP/DNS.     |
| **Fase 4 / Tarea 14** | P1 Protocolo Dual IPFS / IPNS                         | `ipfs-handler.ts`, `main.ts`                           | `npx vitest run reconstruction/brave-desktop/tests/ipfs-handler.test.ts`          | Detección automática de nodo Kubo local con fallback transparente a gateway público.                                   |
| **Fase 5 / Tarea 15** | P0 Verificación Automatizada CDP                      | `cdp-verification.test.ts`, fixture HTML               | `npx vitest run reconstruction/brave-desktop/tests/cdp-verification.test.ts`      | Ejecución E2E vía DevTools Protocol validando bloqueo de trackers, Farbling y cabeceras.                               |
| **Fase 5 / Tarea 16** | P1 Suspensión de Pestañas Inactivas                   | `tab-discarder.ts`, `renderer.js`                      | `npx vitest run reconstruction/brave-desktop/tests/tab-discarder.test.ts`         | Ahorro >30% de memoria en reposo tras inactividad (>15 min) con restauración transparente.                             |
| **Fase 5 / Tarea 17** | Paridad OK / Empaquetado Portable                     | `package.json`, `packaging-assets.test.ts`             | `npx vitest run reconstruction/brave-desktop/tests/packaging-assets.test.ts`      | Integridad total de archivos JSON y construcción exitosa de `Brave-Replica-Portable.exe`.                              |

---

## Verificación Global de la Suite

Para validar la totalidad de las 17 tareas integradas:

```bash
# 1. Ejecución completa de pruebas unitarias y de integración
npx vitest run --config reconstruction/brave-shields/vitest.config.ts

# 2. Compilación del proceso principal de Electron
npm run brave:build

# 3. Empaquetado portable autónomo
npm run brave:portable
```
