import { describe, expect, it } from "vitest";

describe("UI Automation & Interactivity Logic (Tab Physics, Accelerators, Omnibox)", () => {
  describe("Tab Physics & Reordering Logic", () => {
    interface TabItem {
      id: string;
      title: string;
      url: string;
      order: number;
    }

    function reorderTabs(
      tabs: TabItem[],
      fromIndex: number,
      toIndex: number,
    ): TabItem[] {
      if (fromIndex < 0 || fromIndex >= tabs.length) return tabs;
      const targetIndex = Math.max(0, Math.min(tabs.length - 1, toIndex));
      if (fromIndex === targetIndex) return tabs;

      const result = [...tabs];
      const [moved] = result.splice(fromIndex, 1);
      result.splice(targetIndex, 0, moved);

      return result.map((t, idx) => ({ ...t, order: idx }));
    }

    function calculateDragOffset(
      deltaX: number,
      tabWidth: number,
      currentIndex: number,
      totalTabs: number,
    ): number {
      const tentativeTarget = currentIndex + Math.round(deltaX / tabWidth);
      return Math.max(0, Math.min(totalTabs - 1, tentativeTarget));
    }

    it("reordena pestañas correctamente conservando integridad de estado", () => {
      const initial: TabItem[] = [
        {
          id: "tab-1",
          title: "Brave Search",
          url: "https://search.brave.com",
          order: 0,
        },
        { id: "tab-2", title: "GitHub", url: "https://github.com", order: 1 },
        {
          id: "tab-3",
          title: "Wikipedia",
          url: "https://wikipedia.org",
          order: 2,
        },
      ];

      // Drag tab-1 to index 2
      const reordered = reorderTabs(initial, 0, 2);
      expect(reordered.map((t) => t.id)).toEqual(["tab-2", "tab-3", "tab-1"]);
      expect(reordered.map((t) => t.order)).toEqual([0, 1, 2]);

      // Drag back tab-1 from index 2 to index 0
      const restored = reorderTabs(reordered, 2, 0);
      expect(restored.map((t) => t.id)).toEqual(["tab-1", "tab-2", "tab-3"]);
    });

    it("calcula la posición objetivo del arrastre con clamping de límites", () => {
      const tabWidth = 200;
      const totalTabs = 5;

      // Desplazamiento positivo normal (+210px desde tab 0 -> target 1)
      expect(calculateDragOffset(210, tabWidth, 0, totalTabs)).toBe(1);

      // Desplazamiento grande positivo (+800px desde tab 0 -> clampeado al final 4)
      expect(calculateDragOffset(800, tabWidth, 0, totalTabs)).toBe(4);

      // Desplazamiento negativo fuera del límite (-300px desde tab 0 -> clampeado a 0)
      expect(calculateDragOffset(-300, tabWidth, 0, totalTabs)).toBe(0);
    });

    function detectWindowTearOff(
      mouseY: number,
      tabBarTop: number,
      tabBarBottom: number,
      totalTabs: number,
    ): boolean {
      if (totalTabs <= 1) return false;
      const isDetachedVertical =
        mouseY > tabBarBottom + 50 || mouseY < tabBarTop - 25;
      return isDetachedVertical;
    }

    function calculateSiblingShift(
      fromIdx: number,
      targetIdx: number,
      siblingIdx: number,
      tabWidth: number,
    ): number {
      if (siblingIdx === fromIdx) return 0;
      if (
        fromIdx < targetIdx &&
        siblingIdx > fromIdx &&
        siblingIdx <= targetIdx
      ) {
        return -tabWidth;
      }
      if (
        fromIdx > targetIdx &&
        siblingIdx >= targetIdx &&
        siblingIdx < fromIdx
      ) {
        return tabWidth;
      }
      return 0;
    }

    it("detecta correctamente el protocolo de desprendimiento de ventana (Tear-off)", () => {
      const top = 0;
      const bottom = 40;

      // Arrastre horizontal dentro de la barra con 3 pestañas -> NO es tear-off
      expect(detectWindowTearOff(20, top, bottom, 3)).toBe(false);

      // Arrastre hacia abajo fuera de la barra (+95px) con 3 pestañas -> ES tear-off
      expect(detectWindowTearOff(95, top, bottom, 3)).toBe(true);

      // Arrastre hacia arriba fuera de la barra (-35px) con 3 pestañas -> ES tear-off
      expect(detectWindowTearOff(-35, top, bottom, 3)).toBe(true);

      // Si sólo hay 1 pestaña, el tear-off no debe desarmar la única ventana
      expect(detectWindowTearOff(120, top, bottom, 1)).toBe(false);
    });

    it("calcula transform translateX a 60fps para pestañas hermanas", () => {
      const tabWidth = 180;
      // Arrastre de pestaña en índice 0 hacia la derecha al índice 2
      // Hermana en 1 debe deslizarse hacia la izquierda (-180px)
      expect(calculateSiblingShift(0, 2, 1, tabWidth)).toBe(-180);
      // Hermana en 2 debe deslizarse hacia la izquierda (-180px)
      expect(calculateSiblingShift(0, 2, 2, tabWidth)).toBe(-180);
      // Hermana en 3 queda intacta (0px)
      expect(calculateSiblingShift(0, 2, 3, tabWidth)).toBe(0);

      // Arrastre de pestaña en índice 3 hacia la izquierda al índice 1
      // Hermana en 1 debe deslizarse hacia la derecha (+180px)
      expect(calculateSiblingShift(3, 1, 1, tabWidth)).toBe(180);
      // Hermana en 2 debe deslizarse hacia la derecha (+180px)
      expect(calculateSiblingShift(3, 1, 2, tabWidth)).toBe(180);
      // Hermana en 0 queda intacta (0px)
      expect(calculateSiblingShift(3, 1, 0, tabWidth)).toBe(0);
    });
  });

  describe("Keyboard Accelerator Event Dispatcher", () => {
    type BrowserAction =
      | "new-tab"
      | "close-tab"
      | "reopen-tab"
      | "next-tab"
      | "prev-tab"
      | "focus-url"
      | "reload"
      | "hard-reload"
      | "bookmark-page"
      | "bookmark-all"
      | "fullscreen"
      | `select-tab-${number}`
      | "none";

    function mapKeyboardEventToAction(event: {
      ctrlKey: boolean;
      metaKey: boolean;
      shiftKey: boolean;
      altKey: boolean;
      key: string;
      code: string;
    }): BrowserAction {
      const cmdOrCtrl = event.ctrlKey || event.metaKey;

      if (cmdOrCtrl) {
        if (!event.shiftKey && event.key.toLowerCase() === "t")
          return "new-tab";
        if (!event.shiftKey && event.key.toLowerCase() === "w")
          return "close-tab";
        if (event.shiftKey && event.key.toLowerCase() === "t")
          return "reopen-tab";
        if (!event.shiftKey && event.key.toLowerCase() === "l")
          return "focus-url";
        if (!event.shiftKey && event.key.toLowerCase() === "r") return "reload";
        if (event.shiftKey && event.key.toLowerCase() === "r")
          return "hard-reload";
        if (!event.shiftKey && event.key.toLowerCase() === "d")
          return "bookmark-page";
        if (event.shiftKey && event.key.toLowerCase() === "d")
          return "bookmark-all";
        if (event.key === "Tab") {
          return event.shiftKey ? "prev-tab" : "next-tab";
        }
        if (event.key >= "1" && event.key <= "9") {
          return `select-tab-${event.key}` as BrowserAction;
        }
      }

      if (event.key === "F11") return "fullscreen";

      return "none";
    }

    it("mapea combinaciones nativas de Brave/Chromium a acciones de navegación", () => {
      expect(
        mapKeyboardEventToAction({
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          key: "t",
          code: "KeyT",
        }),
      ).toBe("new-tab");

      expect(
        mapKeyboardEventToAction({
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          key: "w",
          code: "KeyW",
        }),
      ).toBe("close-tab");

      expect(
        mapKeyboardEventToAction({
          ctrlKey: true,
          metaKey: false,
          shiftKey: true,
          altKey: false,
          key: "T",
          code: "KeyT",
        }),
      ).toBe("reopen-tab");

      expect(
        mapKeyboardEventToAction({
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          key: "Tab",
          code: "Tab",
        }),
      ).toBe("next-tab");

      expect(
        mapKeyboardEventToAction({
          ctrlKey: true,
          metaKey: false,
          shiftKey: true,
          altKey: false,
          key: "Tab",
          code: "Tab",
        }),
      ).toBe("prev-tab");

      expect(
        mapKeyboardEventToAction({
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          key: "3",
          code: "Digit3",
        }),
      ).toBe("select-tab-3");

      expect(
        mapKeyboardEventToAction({
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          key: "9",
          code: "Digit9",
        }),
      ).toBe("select-tab-9");

      expect(
        mapKeyboardEventToAction({
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          key: "d",
          code: "KeyD",
        }),
      ).toBe("bookmark-page");

      expect(
        mapKeyboardEventToAction({
          ctrlKey: true,
          metaKey: false,
          shiftKey: true,
          altKey: false,
          key: "D",
          code: "KeyD",
        }),
      ).toBe("bookmark-all");

      expect(
        mapKeyboardEventToAction({
          ctrlKey: true,
          metaKey: false,
          shiftKey: true,
          altKey: false,
          key: "R",
          code: "KeyR",
        }),
      ).toBe("hard-reload");

      expect(
        mapKeyboardEventToAction({
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          key: "F11",
          code: "F11",
        }),
      ).toBe("fullscreen");
    });
  });

  describe("Omnibox Autocomplete & Suggestions Blender", () => {
    interface SuggestionItem {
      type: "history" | "bookmark" | "search";
      title: string;
      url: string;
    }

    function blendSuggestions(
      query: string,
      history: { title: string; url: string }[],
      searchApiSuggestions: string[],
    ): SuggestionItem[] {
      const q = query.trim().toLowerCase();
      if (!q) return [];

      const results: SuggestionItem[] = [];

      // 1. History matches
      for (const h of history) {
        if (
          h.title.toLowerCase().includes(q) ||
          h.url.toLowerCase().includes(q)
        ) {
          results.push({ type: "history", title: h.title, url: h.url });
          if (results.length >= 3) break;
        }
      }

      // 2. Search suggestions
      for (const s of searchApiSuggestions) {
        if (!results.some((r) => r.title.toLowerCase() === s.toLowerCase())) {
          results.push({
            type: "search",
            title: s,
            url: `https://search.brave.com/search?q=${encodeURIComponent(s)}`,
          });
        }
        if (results.length >= 6) break;
      }

      return results;
    }

    function handleOmniboxKeyNavigation(
      currentIndex: number,
      totalCount: number,
      key: "ArrowDown" | "ArrowUp" | "Escape",
    ): number {
      if (totalCount === 0) return -1;
      if (key === "ArrowDown") {
        return (currentIndex + 1) % totalCount;
      }
      if (key === "ArrowUp") {
        return currentIndex <= 0 ? totalCount - 1 : currentIndex - 1;
      }
      return -1; // Escape clears selection
    }

    it("combina historial local y sugerencias remotas de Brave Search ordenadamente", () => {
      const history = [
        { title: "Brave Browser Official", url: "https://brave.com" },
        { title: "Brave GitHub Repo", url: "https://github.com/brave" },
      ];
      const searchSuggestions = [
        "brave shields",
        "brave search api",
        "brave download",
      ];

      const blended = blendSuggestions("brave", history, searchSuggestions);
      expect(blended.length).toBe(5);
      expect(blended[0].type).toBe("history");
      expect(blended[0].title).toBe("Brave Browser Official");
      expect(blended[2].type).toBe("search");
      expect(blended[2].title).toBe("brave shields");
    });

    it("navega cíclicamente por las sugerencias con teclado (ArrowDown, ArrowUp, Esc)", () => {
      const total = 4;
      let selected = -1;

      // Down from start (-1) -> 0
      selected = handleOmniboxKeyNavigation(selected, total, "ArrowDown");
      expect(selected).toBe(0);

      // Down to end
      selected = handleOmniboxKeyNavigation(selected, total, "ArrowDown"); // 1
      selected = handleOmniboxKeyNavigation(selected, total, "ArrowDown"); // 2
      selected = handleOmniboxKeyNavigation(selected, total, "ArrowDown"); // 3
      expect(selected).toBe(3);

      // Down wraps around to 0
      selected = handleOmniboxKeyNavigation(selected, total, "ArrowDown");
      expect(selected).toBe(0);

      // Up wraps around to 3
      selected = handleOmniboxKeyNavigation(selected, total, "ArrowUp");
      expect(selected).toBe(3);

      // Escape dismisses (-1)
      selected = handleOmniboxKeyNavigation(selected, total, "Escape");
      expect(selected).toBe(-1);
    });
  });

  describe("Shields v2 Flyout Animated Counter & Tracker Breakdown", () => {
    function easeOutQuadProgress(
      start: number,
      end: number,
      progress: number,
    ): number {
      const clamped = Math.max(0, Math.min(1, progress));
      const ease = 1 - (1 - clamped) * (1 - clamped);
      return Math.round(start + (end - start) * ease);
    }

    interface TrackerRecord {
      domain: string;
      category: "ad" | "tracker" | "script" | "url-param";
    }

    function aggregateBreakdown(
      totalBlocked: number,
      trackers: TrackerRecord[],
    ) {
      const counts = {
        adsAndTrackers: 0,
        scripts: 0,
        urlParams: 0,
        farblingActive: true,
        httpsActive: true,
      };

      for (const t of trackers) {
        if (t.category === "ad" || t.category === "tracker")
          counts.adsAndTrackers++;
        if (t.category === "script") counts.scripts++;
        if (t.category === "url-param") counts.urlParams++;
      }

      // Fallback a estimación estándar de telemetría si solo se cuenta con totalBlocked
      if (counts.adsAndTrackers === 0 && totalBlocked > 0) {
        counts.adsAndTrackers = totalBlocked;
        counts.urlParams = Math.floor(totalBlocked * 0.35);
      }

      return counts;
    }

    it("calcula la animación suave del contador ticker con función de atenuación cuadrática", () => {
      const start = 0;
      const end = 100;

      expect(easeOutQuadProgress(start, end, 0)).toBe(0);
      expect(easeOutQuadProgress(start, end, 0.5)).toBe(75); // Mitad de tiempo -> 75% del valor por ease-out
      expect(easeOutQuadProgress(start, end, 1.0)).toBe(100);
    });

    it("agrega el desglose de categorías de rastreadores y parámetros de telemetría por sitio", () => {
      const sampleTrackers: TrackerRecord[] = [
        { domain: "google-analytics.com", category: "tracker" },
        { domain: "doubleclick.net", category: "ad" },
        { domain: "connect.facebook.net", category: "tracker" },
        { domain: "adservice.google.com", category: "script" },
        { domain: "utm_source", category: "url-param" },
      ];

      const breakdown = aggregateBreakdown(5, sampleTrackers);
      expect(breakdown.adsAndTrackers).toBe(3);
      expect(breakdown.scripts).toBe(1);
      expect(breakdown.urlParams).toBe(1);
      expect(breakdown.farblingActive).toBe(true);
      expect(breakdown.httpsActive).toBe(true);
    });
  });
});
