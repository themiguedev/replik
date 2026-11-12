# Test Infrastructure & Methodology Specification (TEST_INFRA.md)

**Project**: Replik (Brave Browser 1:1 Desktop Replica)  
**Author**: Quality Assurance & E2E Testing Track  
**Status**: ACTIVE / CANONICAL  
**Updated**: 2026-11-11  

---

## 1. Executive Summary & Test Architecture

Replik implements a rigorous, multi-tiered test infrastructure designed to guarantee 1:1 functional, architectural, and visual fidelity with official desktop Brave Browser. The testing pyramid spans unit-level content filtering engine validation, IPC security contract enforcement, pairwise cross-feature interaction testing, and realistic multi-tab research workloads in a live Electron runtime.

```
                              ┌──────────────────────────────────┐
                              │  Tier 4: Real-World Workloads    │
                              │  (10 Scenarios / 5 Suites)       │
                              ├──────────────────────────────────┤
                              │  Tier 3: Pairwise Interactions   │
                              │  (15 Scenarios / 5 Suites)       │
                              ├──────────────────────────────────┤
                              │  Tier 2: Boundary & Stress Tests │
                              │  (16 Scenarios / 4 Suites)       │
                              ├──────────────────────────────────┤
                              │  Tier 1: Core Feature Isolation  │
                              │  (15 Scenarios / 4 Suites)       │
                              ├──────────────────────────────────┤
                              │  E2E Smoke & IPC Security        │
                              │  (Smoke, Prototype, Permissions) │
                              ├──────────────────────────────────┤
                              │  Vitest Shields & Rule Engine    │
                              │  (Unit, CNAME, Farbling, Engine) │
                              └──────────────────────────────────┘
```

---

## 2. Test Execution Environment & Isolation Model

### 2.1 Process Execution Model
All end-to-end (E2E) suites execute via **Playwright for Electron** (`_electron.launch`) pointing directly to bundled application output (`brave-desktop/dist/main.mjs`).

- **Single Worker Serialization (`workers: 1`)**: Multi-window Electron applications share display rasterizers, socket listeners, and OS-level IPC sockets. Parallelizing worker processes on a single physical machine can introduce layout thrashing and port collision; thus `workers: 1` and `fullyParallel: false` are enforced across all Playwright runs.
- **Isolated User Data Directories**: Each test fixture invocation dynamically allocates a distinct temporary directory (`fs.mkdtempSync(path.join(os.tmpdir(), 'replik-e2e-'))`) passed via `--user-data-dir`. Local storage, IndexedDB, site permissions, and session cookies are purged between tests.
- **Renderer Hardening**: Launches run with `--no-sandbox` and `--disable-gpu` to ensure reproducible execution in headless CI/CD and developer environments without GPU driver lockups.

### 2.2 Ephemeral Dynamic Port Mock Server (`MockTestServer`)
To ensure total isolation from external internet volatility, third-party CDN downtime, or ISP rate limits, all network operations route to an in-process, lightweight HTTP mock server:
- **Port Allocation**: Dynamic ephemeral port binding via `new MockTestServer(0)`, querying `server.address().port` post-listen.
- **Test Endpoints**:
  - `/clean.html`: Neutral reference page containing standard editorial HTML.
  - `/ad-heavy.html`: Ad-saturated test page loading simulated Google Ads (`/pagead/adsbygoogle.js`), banner ads (`/ads/banner.js`), and tracking pixels (`/track/pixel.png`).
  - `/cookie-test.html`: Cookie persistence, SameSite inspection, and partition isolation test target.
  - `/dead-link-404`: Deterministic HTTP 404 response generator for Wayback Machine error-handling verification.
  - `/files/test-download.zip`: Deterministic binary payload for download manager verification.
- **State Hygiene**: Tests call `mockServer.clearRequestLog()` in `beforeEach` hooks and terminate instances in `afterAll`.

---

## 3. Structural Contracts & DOM Invariants

The Replik UI shell enforces strict DOM and styling contracts across its tab, omnibox, and webview layers. Tests must strictly query and assert against these canonical patterns:

| Subsystem | Selector / Contract | Description & Invariant |
|---|---|---|
| **Active Webview** | `webview.webview-instance:not(.hidden)` | Exactly ONE webview must be unhidden per active browsing viewport. In Split View, exactly TWO webviews satisfy `:not(.hidden)` (`.split-left` and `.split-right`). |
| **Inactive Webview** | `webview.webview-instance.hidden` | Background webviews are styled with `class="hidden"`, positioned offscreen (`top: -99999px; left: -99999px; position: absolute; visibility: hidden; opacity: 0; pointer-events: none; z-index: 0; display: none !important`). |
| **Active Tab** | `#tab-bar .tab.active` | Exactly one foreground tab possesses class `active`. |
| **New Tab Settlement** | `expect.poll` on `getActiveWebviewUrl()` | When spawning new tabs via `#new-tab-btn` or `Ctrl+T`, tests must wait for `ntp.html` settlement before dispatching URL input to avoid address bar race conditions. |
| **Tab Close Action** | `.tab:hover .tab-close` | Tab close buttons utilize Chromium-style hover reveal. Tests must hover the parent `.tab` element prior to clicking `.tab-close`. |
| **Modal Dialogs & Context Menus** | `.open` class modifier | Popups (`#shields-popup`, `#custom-context-menu`, `#tab-context-menu`, `#task-manager-modal`, `#clear-data-modal`, `#leo-sidebar`) toggle visibility via class `.open`. |
| **Wayback Recovery Bar** | `#wayback-bar.active` | Triggers automatically on HTTP 404/500 errors and dismisses cleanly upon valid navigation or close button click. |
| **Zero-Tab Safety Invariant** | Automatic NTP Respawn | Closing the final open tab never leaves the window in a 0-tab orphaned state; Replik automatically spawns a fresh NTP tab. |

---

## 4. Test Tier Hierarchy & Specification Catalog

### 4.1 Unit & Shields Rule Engine (Vitest)
- **Path**: `tests/unit/`, `brave-shields/tests/`
- **Runner**: Vitest
- **Scope**: Adblock rule parsing (EasyList / EasyPrivacy syntax), network request matching algorithms, cosmetic filter generation, scriptlet injection, query parameter stripping, and CNAME uncloaking.

### 4.2 Smoke & Security Baseline (Playwright)
- **Path**: `tests/e2e/smoke.spec.ts`, `tests/e2e/ipc-security.spec.ts`
- **Scope**: Smoke verification of application boot, main window rendering, omnibox availability, preload context isolation (`contextIsolation: true`, `nodeIntegration: false`), and IPC parameter sanitization against prototype pollution.

### 4.3 Tier 1: Core Feature Isolation
- **Path**: `tests/e2e/tier1-features/`
- **Suites**:
  - `shields.spec.ts`: Basic Shields popup toggle, domain details, scripts blocking.
  - `farbling.spec.ts`: Canvas, WebGL, audio, and battery API farbling / fingerprint protection.
  - `navigation.spec.ts`: Address bar dispatch, back/forward history navigation.
  - `tabs.spec.ts`: Single-tab creation, switching, and closing.

### 4.4 Tier 2: Boundary & Stress Limits
- **Path**: `tests/e2e/tier2-boundaries/`
- **Suites**:
  - `internal-schemes.spec.ts`: Security sandboxing of `brave://settings`, `brave://history`, `brave://bookmarks`.
  - `navigation-limits.spec.ts`: Rapid repeated navigations, malformed URLs, protocol stripping.
  - `omnibox-boundaries.spec.ts`: Search bang prefixes (`:g`, `:gh`), unicode queries, scheme normalization.
  - `tab-stress.spec.ts`: 15+ tab creation, rapid switching without memory leaks.

### 4.5 Tier 3: Cross-Feature Pairwise Interactions
- **Path**: `tests/e2e/tier3-interactions/`
- **Suites**:
  - `omnibox-tabs-webview.spec.ts`: Omnibox input independence during async multi-tab navigation.
  - `shields-adblock-reload.spec.ts`: Shields toggle auto-reload, per-domain overrides, and badge sync.
  - `sidebar-internal-tabs.spec.ts`: Leo sidebar expansion preserving webview DOM and scroll positions.
  - `audio-sleep-lifecycle.spec.ts`: Tab audio indicators (`🔊`/`🔇`), background tab sleeping, and graceful cleanup.
  - `dialogs-focus-shortcuts.spec.ts`: Keyboard accelerators (`Ctrl+T`, `Ctrl+W`, `Ctrl+1..9`, `Shift+Esc`) across modal states.

### 4.6 Tier 4: Real-World Application Workloads
- **Path**: `tests/e2e/tier4-realworld/`
- **Suites**:
  - `research-session-workload.spec.ts`: Multi-topic research journey across tabs with rapid cycling, zero visual flicker, and scroll retention.
  - `privacy-shields-workflow.spec.ts`: End-to-end ad-heavy browsing with dynamic Shields overrides, reload verification, and cross-tab domain persistence.
  - `session-tab-cleanup.spec.ts`: 6-tab multitasking session, tab drag-and-drop reordering, middle closures, `Ctrl+Shift+T` reopen stack, and Zero-Tab NTP safety invariant.
  - `omnibox-navigation-flow.spec.ts`: Autocompletion, direct domain normalization, search bangs, and 404 Wayback Machine recovery.
  - `sidebar-productivity-hub.spec.ts`: Leo AI conversational query, side-by-side Split View (50%/50%), Brave Playlist addition, and window resize adaptability.

---

## 5. Coverage Thresholds & Quality Gates

| Metric | Target / Gate | Enforcement Mechanism |
|---|---|---|
| **E2E Pass Rate** | **100% (0 errors)** | Pre-release test gate across all 6 tiers |
| **Unit Test Pass Rate** | **100% (0 errors)** | `npm test` gate in CI |
| **Electron Memory Leaks** | 0 dangling webview nodes | Active assertions verifying webview DOM count matches tab count |
| **Zero-Tab Invariant** | Strictly enforced | Invariant checked in Tier 4 session cleanup suite |
| **External Network Reliance** | **0 external HTTP requests** | Ephemeral `MockTestServer(0)` encapsulation |
| **Facade / Dummy Policy** | **Strictly Forbidden** | All assertions execute real browser logic against live Electron processes |

---

## 6. Execution Command Reference

```bash
# 1. Build application assets
npm run build

# 2. Run unit and content filtering rule tests
npm test

# 3. Run Playwright E2E Smoke Baseline
npm run test:e2e:smoke

# 4. Run Tier 1 Core Feature Suites
npm run test:e2e:tier1

# 5. Run Tier 2 Boundary & Stress Suites
npm run test:e2e:tier2

# 6. Run Tier 3 Cross-Feature Interaction Suites
npm run test:e2e:tier3

# 7. Run Tier 4 Real-World Application Workload Suites
npm run test:e2e:tier4

# 8. Run Full Complete E2E Test Suite
npm run test:e2e
```
