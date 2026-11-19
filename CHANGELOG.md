# Changelog: Replik (Brave Browser Educational Replica)

Todas las modificaciones notables de este proyecto se documentan en este archivo, siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las convenciones de [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).

---

## [Unreleased]

### Planned / In Progress
- **feat(shields)**: Indexación trigram y búsqueda O(1) con Bloom Filters para reglas adblock masivas.
- **feat(tor)**: Integración de proceso demonio Tor nativo con proxy SOCKS5 (`127.0.0.1:9050`) para pestañas privadas con Tor.
- **feat(ipfs)**: Soporte de resolución nativa para esquemas descentralizados `ipfs://` e `ipns://`.

---

## [v1.8.0] - Parity Milestone (Release Draft)

### Added
- **feat(ui)**: Motor de física y animaciones de arrastre para pestañas (*tab strip physics*) a 60fps con transiciones CSS fluidas, indicador de arrastre (*ghost*) y protocolo de desprendimiento de ventana (*window tear-off* vía IPC).
- **feat(ui)**: Autocompletado interactivo en Omnibox con integración asíncrona a la API de sugerencias de Brave Search (`https://search.brave.com/api/suggest?q=`) y navegación por teclado (Arriba, Abajo, Enter, Escape).
- **feat(shields)**: Expansión del catálogo de sustitutos de red (*surrogates*) a 224 defusers basados en la especificación oficial `resources.json` (Google Analytics, Amazon Ads, GTM, Criteo, New Relic, etc.).
- **feat(shields)**: Motor de salto de rastreadores de rebote (*debounce engine*) configurado con reglas `debounce.json` para evitar redirecciones intermedias de seguimiento.
- **feat(shields)**: Sanitización profunda de URLs mediante reglas declarativas `clean-urls.json` y `query-filter.json` (64+ parámetros eliminados: `fbclid`, `gclid`, `msclkid`, `twclid`, `igsh`, `si`, etc.).
- **feat(farbling)**: Farbling v2 con motor de compatibilidad web (*webcompat exceptions*) alimentado por `webcompat-exceptions.json`, previniendo distorsiones o fallos en sitios interactivos legítimos (Google Maps, WhatsApp Web).
- **feat(privacy)**: Inyección obligatoria de cabecera `Sec-GPC: 1` (Global Privacy Control) en el ciclo de vida de red (`onBeforeSendHeaders`).
- **feat(privacy)**: Reducción de entropía en la cabecera `Accept-Language` para prevenir fingerprinting lingüístico pasivo.

### Changed
- **perf(shields)**: Optimización del evaluador de solicitudes de red con pre-filtrado por dominio y jerarquía de excepciones eTLD+1.
- **style(ui)**: Alineación visual estricta con el sistema de diseño Nala de Brave (paleta de fondo `#1f1f23`, acento `#ff7626`, tipografías Poppins e Inter).
- **feat(ui)**: Rediseño del menú flyout del León de Shields con contadores animados y desglose granular por categoría de elemento bloqueado.

### Security
- **fix(farbling)**: Eliminación de condición de carrera en la inyección de Farbling mediante ejecución a nivel de precarga antes de la evaluación de scripts inline.
- **sec(ipc)**: Fortalecimiento del aislamiento de procesos en Electron v45, garantizando que los webviews operen en entorno sandbox restringido sin acceso a APIs de Node.js.

### Test Metrics
- **test(vitest)**: 100% de tests passing en la suite automatizada (50/50 tests passing en 7 suites: farbling, ui-automation, debounce, query-stripper-matrix, ipc-security, surrogates-catalog, shields-engine).

---

## [v1.0.0] - 2026-10-24

### Added
- **feat(core)**: Arquitectura desacoplada en dos paquetes: `brave-shields` (motor de filtrado y privacidad) y `brave-desktop` (aplicación de navegador basada en Electron v45).
- **feat(shields)**: Parser completo de reglas EasyList/ABP en `rule-parser.ts` (bloqueo de red, excepciones `@@`, ocultación cosmética `##`, scriptlets `+js(...)`).
- **feat(shields)**: Motor de evaluación de red `network-matcher.ts` con clasificación eTLD+1 de primer y tercer orden.
- **feat(shields)**: Sanitizador de parámetros de rastreo `query-stripper.ts` y motor De-AMP para redirección a URLs canónicas.
- **feat(shields)**: Generador de hojas de estilo de ocultación cosmética `cosmetic-filter.ts`.
- **feat(shields)**: Repositorio inicial de recursos neutros `resource-catalog.ts` (Data URIs de transparent GIF y no-op JS).
- **feat(farbling)**: Inyección de micro-ruido determinista en Canvas 2D (`toDataURL`, `getImageData`), AudioContext (`getChannelData`, `AnalyserNode`), WebGL y bloqueo de hardware concurrency.
- **feat(ui)**: Interfaz gráfica WebUI completa con sistema de pestañas, Omnibox, menú del León de Shields y páginas nativas:
  - `ntp.html` (Nueva Pestaña con reloj y estadísticas).
  - `bookmarks.html`, `history.html`, `downloads.html`, `settings.html`.
  - `components.html`, `version.html`, `playlist.html`, `adblock.html`.
- **feat(build)**: Pipeline de construcción con `esbuild` y empaquetado portable con `electron-builder` (`Brave-Replica-Portable.exe` de ~104 MB).
- **test**: Suite de 16 pruebas automatizadas en Vitest con 100% de éxito.
