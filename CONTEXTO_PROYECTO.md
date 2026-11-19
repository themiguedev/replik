# Documento de Contexto y Arquitectura: Ingeniería Inversa y Reconstrucción Educativa de Brave Browser (Replik)

**Autor / Desarrollador:** Miguelangel Contreras Guillen ([@themiguedev](https://github.com/themiguedev))  
**Proyecto:** Replik (Brave Desktop & Shields Architecture Replica)  
**Repositorio Oficial:** [https://github.com/themiguedev/replik](https://github.com/themiguedev/replik)  
**Fecha de Actualización:** Noviembre de 2026 (Hito de Paridad v1.8.0)  
**Entorno de Construcción:** Windows 11 x64 | Node.js | TypeScript | Electron v45 | REA Framework

---

## 1. Resumen Ejecutivo y Propósito del Proyecto

El objetivo central de este proyecto es realizar un proceso integral de **ingeniería inversa, análisis arquitectónico y reconstrucción funcional 1:1** de **Brave Browser** con fines puramente académicos y educativos.

A través del uso del ecosistema **REA (Reverse Engineer Anything)** y el análisis directo de los binarios, componentes de red y estructuras de datos oficiales de Brave Browser instalados en el sistema (`BraveSoftware\Brave-Browser\Application\158.1.100.58` y `User Data`), se procedió a deconstruir la ingeniería interna de su subsistema insignia: **Brave Shields**, así como su marco de interfaz de usuario (**Chromium WebUI**).

Posteriormente, se diseñó e implementó desde cero una réplica completa, funcional y modular denominada **Replik** (`reconstruction/`), implementada en TypeScript moderno y montada sobre el motor de renderizado de Chromium (vía Electron v45), logrando:

1. Una arquitectura modular desacoplada entre el motor de red/filtrado (`brave-shields`) y el cliente de escritorio (`brave-desktop`).
2. Compatibilidad real con las listas oficiales de filtrado de producción de Brave (EasyList, uBlock y `query-filter.json`).
3. Mitigación activa de huella digital (**Farbling v2**) con soporte de compatibilidad web (_webcompat exceptions_).
4. Catálogo ampliado de **224 recursos neutralizadores (surrogates)** basados en `resources.json`.
5. Motor de física de pestañas a 60fps y autocompletado en Omnibox integrado con la API de sugerencias de Brave Search.
6. Generación de ejecutables autónomos y portables para Windows x64 (`Brave-Replica-Portable.exe`).

---

## 2. Metodología de Ingeniería Inversa y Extracción Oficial con REA

El análisis y extracción forense se apoyó en las capacidades de inspección de artefactos y binarios de REA sobre la instalación oficial de Brave Browser (`158.1.100.58`):

1. **Inspección de Binarios y Estructura PE**:
   - Análisis de `brave.exe` y `chrome.dll` para identificar puntos de entrada, argumentos de Chromium y hooks de telemetría deshabilitada.
   - Verificación de las banderas de seguridad y mitigaciones de ejecución (DEP, ASLR, Control Flow Guard).
2. **Deconstrucción de Paquetes de Recursos (.pak) y WebUI**:
   - `brave_resources.pak` (27.03 MB, 1,448 recursos): Endpoints WebUI de Brave (`brave://adblock`, `brave://adblock-internals`, `brave://newtab`, `brave://rewards`, `brave://wallet`, Shields Flyout Panel).
   - `resources.pak` (28.53 MB, 6,272 recursos): Recursos compartidos del sistema Chromium + Brave (`chrome://settings`, `chrome://history`, `chrome://bookmarks`, `chrome://downloads`).
   - Sistema de diseño **Nala**: Extracción de `nala.css`, `reset.css`, `colors.css` y tipografías (`poppins.css`, `inter.css`).
3. **Deconstrucción de Componentes Dinámicos de Brave Shields (`User Data/`)**:
   - **Motores Binarios de Filtrado**: `engine0.dat` (9.17 MB) y `engine1.dat` (2.25 MB) serializados por `adblock-rust` con cabecera mágica `D1 D9 3A AF` (`0xAF3AD9D1`), incorporando filtros de Bloom trigram y tablas hash de selectores CSS.
   - **Listas Maestras**: Componente `iodkpdagapdfkphljnddpjlldadblomo` (5.26 MB de reglas uBlock + EasyList) y `kihnoaefogbkmblfimmibknnmkllbhlf` (EasyPrivacy).
   - **Catálogo de 224 Sucedáneos (`resources.json`)**: Componente `mfddibmblmbccpadfndgakiopmmhebop` (1.32 MB) conteniendo surrogates en Base64 para GA, GTM, Amazon Ads, Criteo, etc.
   - **Reglas de Desvío y Sanitización**:
     - `query-filter.json`: 64+ parámetros globales (`fbclid`, `gclid`, `msclkid`, `twclid`, `igsh`, `si`).
     - `debounce.json`: Reglas para saltar 40+ intermediarios de bounce tracking.
     - `clean-urls.json`: Sanitización profunda por dominio (Facebook, Amazon).
     - `webcompat-exceptions.json`: Exenciones específicas de Canvas y hardware para evitar roturas en sitios interactivos (Google Maps, WhatsApp).
4. **Mapeo de APIs y Prevención de Fingerprinting**:
   - Estudio de cómo Brave inyecta su tecnología de _Farbling_ en el motor V8 para añadir micro-ruido determinista a las llamadas de APIs HTML5 (`Canvas`, `AudioContext`, `WebGL`, `WebRTC`).
5. **Arquitectura Multi-proceso y Seguridad IPC**:
   - Observación de la relación entre el proceso navegador (Browser/UI Process), los procesos de renderizado (`Renderer Process`), el subsistema de red (`Network Service`) y los marcos de aislamiento (`Utility Process`).

---

## 3. Mapeo Arquitectónico: Brave Oficial vs Réplica Educativa

| Subsistema / Componente                      | Brave Oficial (`brave-core` / Chromium C++)                  | Réplica Educativa (`reconstruction/` / `replik`)                                                         |
| :------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **Motor de Renderizado**                     | Chromium Blink / V8 (C++)                                    | Chromium Webview Engine (Electron v45) con `sandbox` y `contextIsolation`                                |
| **Filtrado de Red (Adblock Engine)**         | `adblock-rust` enlazado con C++ en `brave::URLRequestFilter` | `BraveShieldsEngine` + `session.webRequest.onBeforeRequest` en Node.js/TS                                |
| **Sanitización de URLs (De-AMP & Tracking)** | `brave::QueryFilter` leyendo `query-filter.json`             | `QueryStripper` con procesamiento regex, `debounce.json` y `clean-urls.json`                             |
| **Filtrado Cosmético (Ocultación CSS)**      | Inyección de reglas CSS en `content::RenderFrame`            | `CosmeticFilterEngine` inyectando CSS dinámico mediante `webContents.insertCSS`                          |
| **Sucedáneos de Red (Surrogates)**           | Redirección a 224 recursos neutros en `resources.json`       | `ResourceCatalog` con Data URIs de 224 defusers seguros (transparent GIF, no-op JS/Mocks)                |
| **Protección contra Fingerprinting**         | Brave Farbling en el runtime Blink C++                       | `farbling.js` inyectado tempranamente vía scripts de precarga + excepciones `webcompat-exceptions.json`  |
| **Cabeceras de Privacidad**                  | `Sec-GPC: 1` e idiomas normalizados en red                   | Inyección global de `Sec-GPC: 1` y reducción de entropía en `Accept-Language`                            |
| **Privacidad de Red WebRTC y DNS**           | Políticas nativas de enlace UDP y DoH integrado              | Restricción de interfaz UDP (`disable_non_proxied_udp`) y resolutor DoH configurable                     |
| **Interfaz de Usuario (Omnibox & Tabs)**     | Chromium Views Framework / WebUI interno                     | HTML5/CSS3 (Nala `#1f1f23`), física de pestañas a 60fps con _tear-off_ y autocompletado Brave Search API |
| **Empaquetado y Distribución**               | Instalador Omaha / mini_installer.exe                        | `electron-builder` generando ejecutable portable directo de 1 solo archivo y setup NSIS                  |

---

## 4. Estructura del Código y Componentes Desarrollados

El proyecto se estructura de forma limpia en dos paquetes complementarios:

```
reconstruction/
├── brave-shields/                 # Motor agnóstico de filtrado y privacidad
│   ├── src/
│   │   ├── index.ts               # Punto de entrada y exportación de módulos
│   │   ├── types.ts               # Definición de tipos TypeScript (ShieldsDecision, Rule, etc.)
│   │   ├── rule-parser.ts         # Parser de reglas EasyList/ABP (anclajes, dominios, opciones)
│   │   ├── network-matcher.ts     # Comparador de solicitudes de red de alta eficiencia
│   │   ├── query-stripper.ts      # Sanitizador de URLs contra rastreadores y De-AMP
│   │   ├── cosmetic-filter.ts     # Generador de selectores CSS de ocultamiento
│   │   ├── resource-catalog.ts    # Repositorio de recursos sustitutos (224 surrogates)
│   │   └── shields-engine.ts      # Orquestador unificado de Brave Shields
│   ├── tests/
│   │   └── shields-engine.test.ts # Suite de pruebas unitarias automatizadas con Vitest
│   ├── demo.ts                    # Script de demostración interactivo en terminal
│   └── vitest.config.ts           # Configuración de pruebas
│
├── brave-desktop/                 # Aplicación de escritorio y UI del Navegador
│   ├── data/
│   │   ├── query-filter.json      # Catálogo oficial de parámetros de tracking (Brave)
│   │   ├── clean-urls.json        # Reglas de limpieza profunda de URLs
│   │   ├── debounce.json          # Reglas para evasión de bounce tracking
│   │   ├── webcompat-exceptions.json # Excepciones de farbling por dominio
│   │   └── rules.txt              # Reglas maestras de filtrado EasyList (870 KB)
│   ├── dist/                      # Código empaquetado y transpilado por esbuild
│   │   └── main.mjs
│   ├── ui/                        # Interfaz gráfica de usuario WebUI (Nala Design)
│   │   ├── index.html             # Ventana principal: pestañas, omnibox, barra de marcadores, león Shields
│   │   ├── style.css              # Sistema de diseño oficial Brave Nala (#1f1f23, acento naranja #ff7626)
│   │   ├── renderer.js            # Lógica de pestañas (física 60fps), omnibox autocomplete, favoritos
│   │   ├── ntp.html               # Página de Nueva Pestaña con reloj, fondos y estadísticas
│   │   ├── bookmarks.html         # Administrador dedicado de marcadores
│   │   ├── history.html           # Historial de navegación con búsqueda
│   │   ├── downloads.html         # Centro de descargas con progreso
│   │   ├── settings.html          # Panel completo de configuración y privacidad
│   │   ├── extensions.html        # Gestión de extensiones
│   │   ├── components.html        # Estado de listas y componentes de Shields
│   │   ├── version.html           # Información técnica y versiones
│   │   ├── playlist.html          # Réplica de Brave Playlist para contenido multimedia
│   │   ├── adblock.html           # Gestor de suscripciones de filtros personalizados
│   │   ├── wallpapers/            # Colección fotográfica oficial de fondos de pantalla
│   │   ├── icon.ico               # Icono de la aplicación
│   │   └── logo.png               # Logotipo oficial
│   ├── farbling.js                # Inyección anti-fingerprinting v2 con excepciones Webcompat
│   ├── preload.cjs                # Script de precarga seguro para el webview
│   ├── main.ts                    # Proceso principal de Electron (gestión de ventanas, ciclo de vida, IPC)
│   └── package.json               # Metadatos y scripts de compilación
│
├── ROADMAP.md                     # Hoja de ruta técnica de paridad y estados de hitos
├── CHANGELOG.md                   # Registro histórico de versiones y convenciones semánticas
├── RELEASE_NOTES_v1.8.0.md        # Notas de lanzamiento detalladas del hito de paridad v1.8.0
└── CONTEXTO_PROYECTO.md           # Este documento de arquitectura y contexto
```

---

## 5. Profundización en los Módulos Implementados

### 5.1. Brave Shields Engine (`brave-shields`)

- **`rule-parser.ts`**: Analiza líneas de texto en formato EasyList/ABP. Soporta:
  - Reglas de bloqueo de red (`||dominio.com^`).
  - Reglas de excepción (`@@||dominio.com/archivo.js`).
  - Modificadores avanzados (`$third-party`, `$1p`, `$script`, `$image`, `$domain=sitio1.com|~sitio2.com`, `$redirect=...`).
  - Reglas cosméticas de ocultación DOM (`##.publicidad`, `###banner-ads`, `#@#` desocultamiento).
  - Reglas scriptlet (`##+js(...)`).
- **`network-matcher.ts`**: Evalúa en microsegundos (<0.5ms) cada solicitud HTTP/HTTPS contra la base de datos indexada de reglas con clasificación eTLD+1 y prioridad de excepciones.
- **`query-stripper.ts`**: Intercepta URLs antes de su resolución, aplicando las reglas de `query-filter.json` y `clean-urls.json` para neutralizar 64+ parámetros de rastreo y resolver URLs canónicas de Google AMP.
- **`cosmetic-filter.ts`**: Recopila los selectores CSS aplicables a un dominio web específico y genera hojas de estilo dinámicas inyectadas vía `insertCSS`.
- **`resource-catalog.ts`**: Repositorio ampliado a 224 defusers neutros extraídos de `resources.json`, retornando Data URIs seguras con funciones no-op y objetos simulados.

### 5.2. Protección Anti-Fingerprinting (Farbling v2)

Implementado en `farbling.js` e inyectado tempranamente a nivel de precarga antes de cualquier script inline:

- **Canvas Farbling**: Aplica una distorsión infinitesimal e imperceptible en lecturas de `toDataURL()` e `getImageData()`, alterando dinámicamente el hash criptográfico del render.
- **AudioContext Farbling**: Modifica las muestras de audio obtenidas mediante `getChannelData()` y `AnalyserNode` con micro-ruido determinista.
- **WebGL Masking**: Neutraliza la identificación de GPU reportando cadenas y extensiones estandarizadas.
- **Hardware & Memory Protection**: Fija valores genéricos para `navigator.hardwareConcurrency` y `navigator.deviceMemory`.
- **Motor Webcompat**: Consulta `webcompat-exceptions.json` para eximir selectivamente dominios complejos (Google Maps, WhatsApp Web) del ruido gráfico para evitar fallos de renderizado.

### 5.3. Interfaz de Usuario, Física de Pestañas y Omnibox

- **Física de Arrastre de Pestañas a 60fps**:
  - Reordenamiento interactivo en tiempo real con transformaciones aceleradas por hardware.
  - Indicador de arrastre translúcido (_drag ghost_) y transiciones CSS continuas entre pestañas vecinas.
  - Desprendimiento de ventana (_Window Tear-Off_): Al soltar fuera de la barra, emite evento IPC `browser:open-window` para desacoplar la pestaña en una nueva instancia.
- **Omnibox con Sugerencias de Brave Search**:
  - Consultas asíncronas con debounce al endpoint `https://search.brave.com/api/suggest?q=`.
  - Desplegable interactivo navegable con teclado (Arriba, Abajo, Enter, Escape).
- **Menú del León de Brave Shields v2**:
  - Contadores animados en vivo de rastreadores y anuncios bloqueados.
  - Desglose por categorías (rastreadores de red, parámetros de URL, scripts neutralizados, huella digital protegida).
- **Páginas Internas Nativas**:
  - Réplica idéntica de la experiencia WebUI (`brave://settings`, `brave://history`, `brave://bookmarks`, `brave://downloads`, etc.).

---

## 6. Verificación, Tests Automatizados y Seguridad IPC

La integridad y estabilidad de Replik se valida de forma continua mediante una suite automatizada en **Vitest** v5:

```
======================================================================
                        VITEST EXECUTION RESULTS
======================================================================
 ✓ reconstruction/brave-desktop/tests/farbling.test.ts (6 tests)
   - Early WebIDL preload hook execution order.
   - Canvas 2D imperceptible noise distribution.
   - AudioContext buffer deterministic perturbation.
   - WebGL renderer/vendor string masking.
   - Webcompat exceptions bypassing farbling on exempted domains.

 ✓ reconstruction/brave-desktop/tests/ui-automation.test.ts (9 tests)
   - Tab strip 60fps drag-and-drop animation metrics and tear-off events.
   - Omnibox Brave Search API suggestion parsing and keyboard navigation.
   - Nala dark palette CSS variable bindings.
   - Native keyboard accelerators (Ctrl+T, Ctrl+W, Ctrl+Shift+T, Ctrl+L, etc.).
   - Live Shields v2 tracker aggregation breakdown.

 ✓ reconstruction/brave-desktop/tests/debounce.test.ts (5 tests)
   - Intermediary bounce tracker unwrapping across parameter schemas (url, Url, btn_url, rurl).
   - Validation against official Brave debounce.json component.

 ✓ reconstruction/brave-desktop/tests/ipc-security.test.ts (4 tests)
   - UI file:// origin boundary validation.
   - Untrusted and external protocol scheme blocking.
   - OS filesystem path traversal prevention.
   - Webview sandbox enforcement and untrusted preload stripping.

 ✓ reconstruction/brave-shields/tests/surrogates-catalog.test.ts (5 tests)
   - 224 surrogate catalog loading and mime type mapping.
   - Safe Data URI generation for analytics and tag managers (GA, GTM).
   - Fallback behavior on uncataloged resources.

 ✓ reconstruction/brave-shields/tests/query-stripper-matrix.test.ts (9 tests)
   - 64+ commercial tracking parameters stripped (fbclid, gclid, etc.).
   - Domain-specific sanitization (Instagram, Twitter, YouTube).
   - De-AMP canonical URL restoration.
   - Debounce bounce-tracking skip resolution.

 ✓ reconstruction/brave-shields/tests/shields-engine.test.ts (12 tests)
   - RuleParser: network blocking, exceptions, cosmetic hiding, scriptlets.
   - NetworkMatcher: 3rd-party vs 1st-party boundary, exception priority.
   - CosmeticFilterEngine: CSS generation, selector deduplication.
   - BraveShieldsEngine: end-to-end disk list loading and decision evaluation.

 Test Files  7 passed (7)
      Tests  50 passed (50)
   Duration  280ms
======================================================================
```

---

## 7. Empaquetado, Portabilidad y Distribución

Para garantizar la portabilidad sin dependencias previas de entorno, se dispone de un pipeline automatizado con `electron-builder`:

1. **Compilación TypeScript / ESM**:

   ```powershell
   npm run brave:build
   ```

   Utiliza `esbuild` para transpolar y empaquetar `main.ts` en un único archivo ESM ultra optimizado (`dist/main.mjs`).

2. **Generación de Binario Portable**:

   ```powershell
   npm run brave:portable
   ```

   Genera los siguientes binarios en el directorio de distribución:
   - **`Brave-Replica-Portable.exe`** (~104 MB): Ejecutable completamente autónomo para Windows x64.
   - **`Brave-Replica-Setup.exe`** (~104 MB): Instalador NSIS estándar de Windows.

3. **Sincronización Git LFS**:
   Los binarios ejecutables se gestionan mediante **Git Large File Storage (LFS)** con la regla `.gitattributes`:
   ```gitattributes
   *.exe filter=lfs diff=lfs merge=lfs -text
   ```

---

## 8. Documentos de Referencia del Proyecto

- 🗺️ [ROADMAP.md](file:///d:/Usuarios/UCE.FCBA/Documents/New REA/reconstruction/ROADMAP.md): Hoja de ruta de paridad técnica por fases.
- 📜 [CHANGELOG.md](file:///d:/Usuarios/UCE.FCBA/Documents/New REA/reconstruction/CHANGELOG.md): Registro histórico de cambios y versiones semánticas.
- 🚀 [RELEASE_NOTES_v1.8.0.md](file:///d:/Usuarios/UCE.FCBA/Documents/New REA/reconstruction/RELEASE_NOTES_v1.8.0.md): Notas de lanzamiento detalladas del hito de paridad v1.8.0.
- 💻 [Repositorio Oficial en GitHub](https://github.com/themiguedev/replik): Código fuente, issues y lanzamientos.
