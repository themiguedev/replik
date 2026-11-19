# Roadmap de Paridad: Replik (Brave Browser 1:1 Replica)

Este documento traza la hoja de ruta técnica, los hitos de paridad y el estado de implementación de **Replik** frente a la versión oficial de **Brave Browser (v158.1.100.58)**.

---

## 🎯 Objetivo de Paridad

Alcanzar paridad funcional, visual y de privacidad del 100% con la arquitectura de Brave Browser, preservando una base de código desacoplada, tipada (TypeScript/Electron v45) y estrictamente documentada para fines educativos y de investigación.

---

## 📊 Matriz de Fases e Hitos de Paridad

```
┌────────────────────────────────────────────────────────────────────────┐
│                   REPLIK PARITY MILESTONES ROADMAP                     │
└────────────────────────────────────────────────────────────────────────┘
  [Phase 1] Shields & Surrogates      ───► Bloom Indexing & 224 Defusers
  [Phase 2] Farbling v2 & Privacy     ───► WebIDL Timing & Sec-GPC Headers
  [Phase 3] WebUI & Tab Physics       ───► 60fps Drag & Brave Search API
  [Phase 4] Tor & Protocols           ───► SOCKS5 Routing & IPFS Fallback
  [Phase 5] Verification & Packaging  ───► Vitest 100% & Portable Executable
```

| Fase       | Hito / Componente                     | Prioridad |     Estado     | Entregables Principales                                                                                                                                                                                                      |
| :--------- | :------------------------------------ | :-------: | :------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fase 1** | **Shields & Surrogates Engine**       |  **P0**   | 🟡 En Progreso | Trigram Bloom matcher, catálogo de 224 surrogates (`resources.json`), motor de De-AMP y sanitización de URLs (`query-filter.json`, `clean-urls.json`, `debounce.json`).                                                      |
| **Fase 2** | **Farbling v2 & Privacy Headers**     |  **P0**   | 🟡 En Progreso | Inyección WebIDL previa a scripts inline, motor de excepciones Webcompat (`webcompat-exceptions.json`), inyección de cabecera `Sec-GPC: 1` y reducción de entropía en `Accept-Language`.                                     |
| **Fase 3** | **WebUI, Tab Physics & Omnibox**      | **P0/P1** | 🟡 En Progreso | Animación de arrastre de pestañas a 60fps con cálculo de distancias y desprendimiento de ventana (_tear-off_), sugerencias interactivas de Brave Search API en Omnibox, paleta Nala (`#1f1f23`), panel flyout de Shields v2. |
| **Fase 4** | **Tor Mode & Network Protocols**      |  **P1**   | ⚪ Planificado | Demonio Tor embebido con enrutamiento SOCKS5 (`127.0.0.1:9050`), resolución de dominios `.onion`, fallback a gateway IPFS/IPNS (`dweb.link`) y configuración DoH.                                                            |
| **Fase 5** | **Verificación Continua & Packaging** |  **P0**   |   🟢 Activo    | Suite automatizada Vitest (`reconstruction/brave-shields` y `reconstruction/brave-desktop`), tests de seguridad IPC, generación de ejecutables portables `Brave-Replica-Portable.exe` y setup NSIS.                          |

---

## 🚀 Desglose Detallado por Fase

### Fase 1: Motor Avanzado de Shields y Sustitución de Recursos

- [x] **Parser EasyList/ABP**: Soporte de reglas de bloqueo de red (`||`, `|`, `^`, `*`), excepciones (`@@`), selectores cosméticos (`##`, `#@#`) y scriptlets (`+js(...)`).
- [x] **Network Matcher**: Clasificación eTLD+1 de primer/tercer orden, priorización estricta de excepciones y soporte básico de redirección.
- [ ] **Trigram & Bloom Filter Matcher**: Indexación de reglas y optimización de búsqueda O(1) similar a `adblock-rust` para soportar listas masivas (>80,000 reglas).
- [ ] **Expansión a 224 Surrogates**: Incorporación del catálogo completo de `resources.json` oficial (Google Analytics, Amazon Ads, GTM, Criteo, etc.) en `ResourceCatalog`.
- [ ] **Motor Debounce & Clean URLs**: Detección y salto automático de dominios intermedios de rastreo (bounce tracking) y eliminación de 64+ parámetros de rastreo (`fbclid`, `gclid`, `msclkid`, `twclid`, `igsh`, `si`).

### Fase 2: Protección Farbling v2 y Cabeceras de Privacidad

- [x] **Farbling Básico**: Distorsión determinista de `Canvas` (`toDataURL`, `getImageData`), micro-ruido en `AudioContext` (`getChannelData`), spoofing WebGL y enmascaramiento de hardware.
- [ ] **Inyección Temprana WebIDL**: Eliminar condición de carrera en scripts inline asegurando que los hooks de farbling se ejecuten antes de cualquier parseo de script en el documento.
- [ ] **Motor de Excepciones Webcompat**: Soporte de `webcompat-exceptions.json` para evitar roturas visuales en aplicaciones legítimas (ej. Google Maps, WhatsApp Web).
- [ ] **Cabeceras de Privacidad**:
  - Inyección de `Sec-GPC: 1` (Global Privacy Control) en todas las solicitudes salientes.
  - Reducción de entropía en cabecera `Accept-Language` para prevenir rastreo por locale.

### Fase 3: Interfaz de Usuario Nala, Física de Pestañas y Omnibox

- [x] **Diseño Nala Base**: Paleta oscura oficial (`#1f1f23`), acentos naranja Brave (`#ff7626`), tipografía Poppins/Inter.
- [x] **Páginas WebUI Internas**: `brave://settings`, `brave://history`, `brave://bookmarks`, `brave://downloads`, `brave://components`, `brave://version`, `brave://newtab`.
- [ ] **Física de Arrastre de Pestañas (Tab Strip Physics)**:
  - Arrastre interactivo con transformaciones fluidas a 60fps.
  - Detección de orden relativo y animación suave entre pestañas vecinas.
  - Protocolo de ventana emergente (_tear-off_) al soltar la pestaña fuera de la barra.
- [ ] **Omnibox con Sugerencias de Brave Search**:
  - Consulta asíncrona a `https://search.brave.com/api/suggest?q=`.
  - Desplegable con navegación por teclado (Arriba/Abajo, Enter, Escape).
  - Integración fluida con marcadores e historial local.
- [ ] **Shields Flyout v2**:
  - Panel flotante con desglose por categoría de rastreador y switch por sitio.

### Fase 4: Protocolos de Red y Modo Tor

- [x] **Aislamiento de Sesión y DoH**: Enrutamiento DNS seguro sobre HTTPS vía Cloudflare/Google.
- [ ] **Tor SOCKS5 Daemon**: Gestión de proceso de fondo con puente SOCKS5 y aislamiento estricto de tráfico en ventanas privadas Tor.
- [ ] **Soporte Descentralizado IPFS/IPNS**: Resolución de esquemas `ipfs://` e `ipns://` con redirección transparente a gateway público seguro o daemon local.

### Fase 5: QA Automatizado y Distribución Continua

- [x] **Suite de Pruebas Unitarias**: 16/16 tests passing en Vitest para Shields y seguridad de IPC.
- [x] **Pipeline de Empaquetado**: Transpilación `esbuild` de `main.ts` y empaquetado portable con `electron-builder`.
- [ ] **E2E Automation Battery**: Pruebas automáticas de ciclo de vida de UI, inyección de Farbling y validación de sanitización de URLs.
