import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

describe("Brave Farbling Engine (Protección Avanzada de Huella Digital)", () => {
  const farblingScriptPath = path.resolve(__dirname, "../farbling.js");
  const farblingSource = fs.readFileSync(farblingScriptPath, "utf-8");

  function createBrowserContext(domain: string = "test.example.com") {
    const sandbox: Record<string, any> = {
      console: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
      window: {},
      navigator: {},
    };

    sandbox.window.location = { hostname: domain };
    sandbox.window.navigator = sandbox.navigator;

    // Mock CanvasRenderingContext2D
    class MockCanvasRenderingContext2D {
      getImageData(sx: number, sy: number, sw: number, sh: number) {
        // Return 4 * 128 elements of dummy RGBA data
        const data = new Uint8ClampedArray(sw * sh * 4);
        for (let i = 0; i < data.length; i++) {
          data[i] = 100;
        }
        return { data, width: sw, height: sh };
      }
      putImageData(img: any, dx: number, dy: number) {}
    }

    // Mock HTMLCanvasElement
    class MockHTMLCanvasElement {
      width = 100;
      height = 100;
      getContext(type: string) {
        if (type === "2d") return new MockCanvasRenderingContext2D();
        return null;
      }
      toDataURL(...args: any[]) {
        return "data:image/png;base64,mocked";
      }
      toBlob(cb: (blob: any) => void) {
        cb(new Blob(["mock"]));
      }
    }

    // Mock Web Audio API
    class MockAudioBuffer {
      getChannelData(channel: number) {
        const data = new Float32Array(512);
        for (let i = 0; i < data.length; i++) data[i] = 0.5;
        return data;
      }
    }

    class MockAnalyserNode {
      getFloatFrequencyData(array: Float32Array) {
        for (let i = 0; i < array.length; i++) array[i] = -50.0;
      }
      getByteFrequencyData(array: Uint8Array) {
        for (let i = 0; i < array.length; i++) array[i] = 128;
      }
    }

    // Mock WebGL
    class MockWebGLRenderingContext {
      getParameter(param: number) {
        if (param === 37445) return "Original Real GPU Vendor";
        if (param === 37446) return "Original Real GPU Renderer";
        return 0;
      }
      readPixels(
        x: number,
        y: number,
        w: number,
        h: number,
        format: any,
        type: any,
        pixels: Uint8Array,
      ) {
        for (let i = 0; i < pixels.length; i++) pixels[i] = 200;
      }
    }

    sandbox.CanvasRenderingContext2D = MockCanvasRenderingContext2D;
    sandbox.HTMLCanvasElement = MockHTMLCanvasElement;
    sandbox.AudioBuffer = MockAudioBuffer;
    sandbox.AnalyserNode = MockAnalyserNode;
    sandbox.WebGLRenderingContext = MockWebGLRenderingContext;
    sandbox.WebGL2RenderingContext = MockWebGLRenderingContext;

    // Attach to sandbox.window
    sandbox.window.CanvasRenderingContext2D = MockCanvasRenderingContext2D;
    sandbox.window.HTMLCanvasElement = MockHTMLCanvasElement;
    sandbox.window.AudioBuffer = MockAudioBuffer;
    sandbox.window.AnalyserNode = MockAnalyserNode;
    sandbox.window.WebGLRenderingContext = MockWebGLRenderingContext;
    sandbox.window.WebGL2RenderingContext = MockWebGLRenderingContext;

    const ctx = vm.createContext(sandbox);
    return { ctx, sandbox };
  }

  it("se inyecta sin lanzar excepciones en el entorno del navegador", () => {
    const { ctx } = createBrowserContext("targetsite.com");
    expect(() => {
      vm.runInContext(farblingSource, ctx);
    }).not.toThrow();
  });

  it("aplica micro-ruido determinista a CanvasRenderingContext2D.getImageData", () => {
    const { ctx, sandbox } = createBrowserContext("testcanvas.com");
    vm.runInContext(farblingSource, ctx);

    const context = new sandbox.CanvasRenderingContext2D();
    const imageData = context.getImageData(0, 0, 64, 64);

    // Baseline was 100, noise is +1 or -1 for sampled indices
    let hasVariance = false;
    for (let i = 0; i < imageData.data.length; i += 128) {
      if (imageData.data[i] !== 100) {
        hasVariance = true;
        expect([99, 101]).toContain(imageData.data[i]);
      }
    }
    expect(hasVariance).toBe(true);
  });

  it("spoofea UNMASKED_VENDOR_WEBGL y UNMASKED_RENDERER_WEBGL a perfiles Brave genéricos", () => {
    const { ctx, sandbox } = createBrowserContext("webgltest.org");
    vm.runInContext(farblingSource, ctx);

    const gl = new sandbox.WebGLRenderingContext();
    const vendor = gl.getParameter(37445);
    const renderer = gl.getParameter(37446);

    expect(vendor).toBe("Google Inc. (Brave Shields Farbling)");
    expect(renderer).toBe("ANGLE (Generic Direct3D11 / Brave Shielded GPU)");
  });

  it("aplica farbling al AudioBuffer y AnalyserNode sin corromper la reproducción", () => {
    const { ctx, sandbox } = createBrowserContext("audiotest.fm");
    vm.runInContext(farblingSource, ctx);

    const buffer = new sandbox.AudioBuffer();
    const channelData = buffer.getChannelData(0);
    expect(channelData.length).toBe(512);
    // Values should have micro-jitter around 0.5
    expect(channelData[0]).not.toBe(0.5);
    expect(Math.abs(channelData[0] - 0.5)).toBeLessThan(0.001);

    const analyser = new sandbox.AnalyserNode();
    const byteFreq = new Uint8Array(64);
    analyser.getByteFrequencyData(byteFreq);
    expect(byteFreq[0]).toBeGreaterThanOrEqual(127);
    expect(byteFreq[0]).toBeLessThanOrEqual(129);
  });

  it("normaliza hardwareConcurrency y deviceMemory a valores estándar anti-fingerprint (8)", () => {
    const { ctx, sandbox } = createBrowserContext("privacycheck.org");
    vm.runInContext(farblingSource, ctx);

    expect(sandbox.navigator.hardwareConcurrency).toBe(8);
    expect(sandbox.navigator.deviceMemory).toBe(8);
  });

  it("activa defusers anti-adblock y sugarcoat de adsbygoogle para prevenir detección", () => {
    const { ctx, sandbox } = createBrowserContext("antiscrape.com");
    vm.runInContext(farblingSource, ctx);

    expect(sandbox.window.canRunAds).toBe(true);
    expect(sandbox.window.isAdBlockActive).toBe(false);
    expect(sandbox.window.hasAdBlocker).toBe(false);
    expect(sandbox.window.adBlockerDetected).toBe(false);

    expect(sandbox.window.adsbygoogle).toBeDefined();
    expect(sandbox.window.adsbygoogle.loaded).toBe(true);
    expect(typeof sandbox.window.adsbygoogle.push).toBe("function");
    expect(sandbox.window.adsbygoogle.push({})).toBe(0);
  });
});
