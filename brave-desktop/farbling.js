// Brave Farbling Engine (Protección Avanzada contra Huella Digital)
// Inyectado al inicio del contexto de la página (document_start)
(function () {
  try {
    // Generar una semilla determinista por dominio pero efímera por sesión
    const domain = window.location.hostname || 'global';
    let seed = 0;
    for (let i = 0; i < domain.length; i++) {
      seed = (seed << 5) - seed + domain.charCodeAt(i);
      seed |= 0;
    }

    // Generador pseudoaleatorio simple (PRNG)
    function pseudoRandom() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // 1. ADVANCED CANVAS FARBLING
    // Agrega micro-ruido imperceptible al leer píxeles de canvas 2D
    if (typeof CanvasRenderingContext2D !== 'undefined') {
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (sx, sy, sw, sh, settings) {
        const imageData = originalGetImageData.call(this, sx, sy, sw, sh, settings);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 128) {
          const noise = pseudoRandom() > 0.5 ? 1 : -1;
          data[i] = Math.min(255, Math.max(0, data[i] + noise));
        }
        return imageData;
      };
    }

    if (typeof HTMLCanvasElement !== 'undefined') {
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (...args) {
        try {
          const ctx = this.getContext('2d');
          if (ctx && this.width > 0 && this.height > 0) {
            const img = ctx.getImageData(0, 0, 1, 1);
            img.data[0] = (img.data[0] ^ 1);
            ctx.putImageData(img, 0, 0);
          }
        } catch (e) {}
        return originalToDataURL.apply(this, args);
      };

      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      if (originalToBlob) {
        HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
          try {
            const ctx = this.getContext('2d');
            if (ctx && this.width > 0 && this.height > 0) {
              const img = ctx.getImageData(0, 0, 1, 1);
              img.data[0] = (img.data[0] ^ 1);
              ctx.putImageData(img, 0, 0);
            }
          } catch (e) {}
          return originalToBlob.call(this, callback, ...args);
        };
      }
    }

    // 2. ADVANCED AUDIO FARBLING (Web Audio API & Analyser Frequency Noise)
    if (typeof AudioBuffer !== 'undefined') {
      const originalGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function (channel) {
        const data = originalGetChannelData.call(this, channel);
        for (let i = 0; i < data.length; i += 256) {
          data[i] += (pseudoRandom() - 0.5) * 0.0000001;
        }
        return data;
      };
    }

    if (typeof AnalyserNode !== 'undefined') {
      const origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
      if (origGetFloatFreq) {
        AnalyserNode.prototype.getFloatFrequencyData = function (array) {
          origGetFloatFreq.call(this, array);
          for (let i = 0; i < array.length; i += 32) {
            array[i] += (pseudoRandom() - 0.5) * 0.01;
          }
        };
      }
      const origGetByteFreq = AnalyserNode.prototype.getByteFrequencyData;
      if (origGetByteFreq) {
        AnalyserNode.prototype.getByteFrequencyData = function (array) {
          origGetByteFreq.call(this, array);
          for (let i = 0; i < array.length; i += 32) {
            array[i] = Math.min(255, Math.max(0, array[i] + (pseudoRandom() > 0.5 ? 1 : -1)));
          }
        };
      }
    }

    // 3. ADVANCED WEBGL & WEBGL2 SPOOFING + READPIXELS NOISE
    function patchWebGL(proto) {
      if (!proto) return;
      const originalGetParameter = proto.getParameter;
      proto.getParameter = function (param) {
        // UNMASKED_VENDOR_WEBGL (0x9245)
        if (param === 37445) {
          return 'Google Inc. (Brave Shields Farbling)';
        }
        // UNMASKED_RENDERER_WEBGL (0x9246)
        if (param === 37446) {
          return 'ANGLE (Generic Direct3D11 / Brave Shielded GPU)';
        }
        return originalGetParameter.call(this, param);
      };

      const originalReadPixels = proto.readPixels;
      if (originalReadPixels) {
        proto.readPixels = function (x, y, w, h, format, type, pixels) {
          originalReadPixels.call(this, x, y, w, h, format, type, pixels);
          if (pixels && pixels.length) {
            for (let i = 0; i < pixels.length; i += 256) {
              pixels[i] = Math.min(255, Math.max(0, pixels[i] + (pseudoRandom() > 0.5 ? 1 : -1)));
            }
          }
        };
      }
    }

    if (typeof WebGLRenderingContext !== 'undefined') {
      patchWebGL(WebGLRenderingContext.prototype);
    }
    if (typeof WebGL2RenderingContext !== 'undefined') {
      patchWebGL(WebGL2RenderingContext.prototype);
    }

    // 4. NORMALIZACIÓN DE HARDWARE Y PLUGINS
    try {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        configurable: true,
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true,
      });
      if (navigator.getBattery) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1.0,
          addEventListener: () => {},
          removeEventListener: () => {},
        });
      }
    } catch (e) {}

    console.log('[Brave Shields] Farbling Avanzado de Audio, Canvas y WebGL activo para:', domain);
  } catch (err) {
    // Protección a prueba de fallos: nunca romper la ejecución del sitio web
  }
})();
