# Documento de Contexto y Arquitectura: Ingeniería Inversa y Reconstrucción Educativa de Brave Browser (Replik)

**Autor / Desarrollador:** Miguelangel Contreras Guillen ([@themiguedev](https://github.com/themiguedev))  
**Proyecto:** Replik (Brave Desktop & Shields Architecture Replica)  
**Repositorio Oficial:** [https://github.com/themiguedev/replik](https://github.com/themiguedev/replik)  
**Fecha:** Octubre de 2026  
**Entorno de Construcción:** Windows 11 x64 | Node.js | TypeScript | Electron v45 | REA Framework  

---

## 1. Resumen Ejecutivo y Propósito del Proyecto

El objetivo central de este proyecto fue realizar un proceso integral de **ingeniería inversa, análisis arquitectónico y reconstrucción funcional** de **Brave Browser** con fines puramente académicos y educativos.

A través del uso del ecosistema **REA (Reverse Engineer Anything)** y el análisis directo de los binarios, componentes de red y estructuras de datos oficiales de Brave Browser instalados en el sistema (`BraveSoftware\Brave-Browser\Application` e instaladores oficiales), se procedió a deconstruir la ingeniería interna de su subsistema insignia: **Brave Shields**, así como su marco de interfaz de usuario (**Chromium WebUI**).

Posteriormente, se diseñó e implementó desde cero una réplica completa, funcional y modular denominada **Replik** (`reconstruction/`), implementada en TypeScript moderno y montada sobre el motor de renderizado de Chromium (vía Electron v45), logrando:
1. Una arquitectura modular desacoplada entre el motor de red/filtrado (`brave-shields`) y el cliente de escritorio (`brave-desktop`).
2. Compatibilidad real con las listas oficiales de filtrado de producción de Brave (EasyList, uBlock y `query-filter.json`).
3. Mitigación activa de huella digital (**Farbling**) y aislamiento de privacidad.
4. Generación de ejecutables autónomos y portables para Windows x64 (`Brave-Replica-Portable.exe`).

---

## 2. Metodología de Ingeniería Inversa con REA

El análisis inicial se apoyó en las capacidades de inspección de artefactos y binarios de REA:

1. **Inspección de Binarios y Estructura PE**:
   - Análisis de `brave.exe` y `chrome.dll` para identificar puntos de entrada, argumentos de Chromium y hooks de telemetría deshabilitada.
   - Verificación de las banderas de seguridad y mitigaciones de ejecución (DEP, ASLR, Control Flow Guard).
2. **Deconstrucción de Componentes Dinámicos de Brave Shields**:
   - Se localizó el directorio de componentes actualizables de Brave (`iodkpdagapdfkphljnddpjlldadblomo`), extrayendo el archivo maestro de reglas de red (`list.txt` con más de 870 KB de reglas ABP/EasyList) y el archivo de parámetros de seguimiento `query-filter.json`.
3. **Mapeo de APIs y Prevención de Fingerprinting**:
   - Estudio de cómo Brave inyecta su tecnología de *Farbling* en el motor V8 para añadir micro-ruido cuántico/pseudialeatorio a las llamadas de APIs HTML5 (`Canvas`, `AudioContext`, `WebGL`, `WebRTC`).
4. **Arquitectura Multi-proceso**:
   - Observación de la relación entre el proceso navegador (Browser/UI Process), los procesos de renderizado (`Renderer Process`), el subsistema de red (`Network Service`) y los marcos de aislamiento (`Utility Process`).

---

## 3. Mapeo Arquitectónico: Brave Oficial vs Réplica Educativa

| Subsistema / Componente | Brave Oficial (`brave-core` / Chromium C++) | Réplica Educativa (`reconstruction/` / `replik`) |
| :--- | :--- | :--- |
| **Motor de Renderizado** | Chromium Blink / V8 (C++) | Chromium Webview Engine (Electron v45) con `sandbox` y `contextIsolation` |
| **Filtrado de Red (Adblock Engine)** | `adblock-rust` enlazado con C++ en `brave::URLRequestFilter` | `BraveShieldsEngine` + `session.webRequest.onBeforeRequest` en Node.js/TS |
| **Sanitización de URLs (De-AMP & Tracking)** | `brave::QueryFilter` leyendo `query-filter.json` | `QueryStripper` con procesamiento de expresiones regulares y parámetros de exclusión |
| **Filtrado Cosmético (Ocultación CSS)** | Inyección de reglas CSS en `content::RenderFrame` | `CosmeticFilterEngine` inyectando CSS dinámico mediante `webContents.insertCSS` |
| **Sucedáneos de Red (Surrogates)** | Redirección a recursos neutros en `resources.json` | `ResourceCatalog` con Data URIs seguros (transparent 1x1 GIF, no-op JavaScript) |
| **Protección contra Fingerprinting** | Brave Farbling en el runtime Blink C++ | `farbling.js` inyectado tempranamente vía scripts de precarga (`preload.cjs`) |
| **Privacidad de Red WebRTC y DNS** | Políticas nativas de enlace UDP y DoH integrado | Restricción de interfaz UDP (`disable_non_proxied_udp`) y resolutor DoH configurable |
| **Interfaz de Usuario (Omnibox & Tabs)** | Chromium Views Framework / WebUI interno | HTML5 semántico, CSS3 moderno (diseño dark nativo Brave `#1f1f23`) y JavaScript modular |
| **Empaquetado y Distribución** | Instalador Omaha / mini_installer.exe | `electron-builder` generando ejecutable portable directo de 1 solo archivo y setup NSIS |

---

## 4. Estructura del Código y Componentes Desarrollados

El proyecto se estructuró de forma limpia en dos paquetes complementarios:

```
replik/
├── brave-shields/                 # Motor agnóstico de filtrado y privacidad
│   ├── src/
│   │   ├── index.ts               # Punto de entrada y exportación de módulos
│   │   ├── types.ts               # Definición de tipos TypeScript (ShieldsDecision, Rule, etc.)
│   │   ├── rule-parser.ts         # Parser de reglas EasyList/ABP (anclajes, dominios, opciones)
│   │   ├── network-matcher.ts     # Comparador de solicitudes de red de alta eficiencia
│   │   ├── query-stripper.ts      # Sanitizador de URLs contra rastreadores y De-AMP
│   │   ├── cosmetic-filter.ts     # Generador de selectores CSS de ocultamiento
│   │   ├── resource-catalog.ts    # Repositorio de recursos sustitutos (surrogates)
│   │   └── shields-engine.ts      # Orquestador unificado de Brave Shields
│   ├── tests/
│   │   └── shields-engine.test.ts # Suite de pruebas unitarias automatizadas con Vitest
│   ├── demo.ts                    # Script de demostración interactivo en terminal
│   └── vitest.config.ts           # Configuración de pruebas
│
├── brave-desktop/                 # Aplicación de escritorio y UI del Navegador
│   ├── data/
│   │   ├── query-filter.json      # Catálogo oficial de parámetros de tracking (Brave)
│   │   └── rules.txt              # Reglas maestras de filtrado EasyList (870 KB)
│   ├── dist/                      # Código empaquetado y transpilado por esbuild
│   │   └── main.mjs
│   ├── ui/                        # Interfaz gráfica de usuario WebUI
│   │   ├── index.html             # Ventana principal: pestañas, omnibox, barra de marcadores, león Shields
│   │   ├── style.css              # Sistema de diseño oficial Brave (paleta carbón, acento naranja)
│   │   ├── renderer.js            # Lógica de pestañas, navegación, favoritos, menús contextuales
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
│   ├── farbling.js                # Script de inyección anti-fingerprinting
│   ├── preload.cjs                # Script de precarga seguro para el webview
│   ├── main.ts                    # Proceso principal de Electron (gestión de ventanas, ciclo de vida)
│   └── package.json               # Metadatos y scripts de compilación
├── Brave-Replica-Portable.exe     # Binario portable autónomo para Windows x64 (Git LFS)
├── Brave-Replica-Setup.exe        # Instalador guiado para Windows x64 (Git LFS)
├── start.bat                      # Lanzador directo de conveniencia para Windows
└── CONTEXTO_PROYECTO.md           # Informe de contexto y arquitectura técnica
```

---

## 5. Profundización en los Módulos Implementados

### 5.1. Brave Shields Engine (`brave-shields`)
* **`rule-parser.ts`**: Analiza líneas de texto en formato EasyList. Soporta:
  - Reglas de bloqueo de red (`||dominio.com^`).
  - Reglas de excepción (`@@||dominio.com/archivo.js`).
  - Opciones de regla (`$third-party`, `$script`, `$image`, `$domain=sitio1.com|~sitio2.com`).
  - Reglas cosméticas de ocultación de elementos DOM (`##.publicidad`, `###banner-ads`).
* **`network-matcher.ts`**: Evalúa en microsegundos cada solicitud HTTP/HTTPS originada en el navegador contra la base de datos indexada de reglas, determinando si debe permitirse, bloquearse o redirigirse a un recurso sustituto.
* **`query-stripper.ts`**: Intercepta URLs antes de ser resueltas y elimina parámetros de seguimiento comercial (`fbclid`, `gclid`, `mc_eid`, `utm_source`, `utm_medium`, `utm_campaign`, etc.). Además, detecta URLs de Google AMP y redirige al usuario a la página web real original.
* **`cosmetic-filter.ts`**: Recopila los selectores CSS aplicables a un dominio web específico y los inyecta en el documento para ocultar banners y anuncios antes de que el usuario los visualice.
* **`resource-catalog.ts`**: Satisface scripts de rastreo bloqueados devolviendo contenido vacío o funciones no-op seguras para prevenir que la funcionalidad legítima del sitio web se interrumpa.

### 5.2. Protección Anti-Fingerprinting (Farbling)
Implementado en `farbling.js` e inyectado antes de cualquier ejecución de script de terceros:
* **Canvas Farbling**: Aplica una distorsión infinitesimal e imperceptible al ojo humano en las lecturas de `toDataURL()` e `getImageData()`, provocando que el hash criptográfico generado para la huella digital cambie de forma dinámica.
* **AudioContext Farbling**: Modifica las muestras de audio obtenidas a través de `getChannelData()` y `AnalyserNode` con micro-ruido determinista.
* **WebGL Masking**: Neutraliza la identificación de la GPU y la tarjeta gráfica reportando configuraciones genéricas no rastreables.
* **Hardware & Memory Protection**: Fija valores estandarizados para la memoria del dispositivo y la cantidad de núcleos del procesador.

### 5.3. Interfaz de Usuario y Chromium WebUI
* **Pestañas y Omnibox**: Sistema de pestañas dinámico con animación fluida, botón de cierre individual, selector de pestañas, búsqueda rápida con debounce, autocompletado y atajos de teclado (`Ctrl+T`, `Ctrl+W`, `Ctrl+Tab`, `Ctrl+L`).
* **Menú del León de Brave Shields**:
  - Contador en vivo de solicitudes y rastreadores bloqueados.
  - Interruptor global ON/OFF de protección para el dominio activo.
  - Panel informativo desglosado (Anuncios y rastreadores, conexiones actualizadas a HTTPS, scripts bloqueados, huella digital protegida).
* **Barra y Administrador de Marcadores**:
  - Soporte completo de menús contextuales en la barra (abrir en pestaña, ventana privada, editar, eliminar).
  - Modal integrado para añadir y clasificar marcadores de forma manual e intuitiva.
  - Página completa dedicada `bookmarks.html` para gestión jerárquica.
* **Páginas Internas Nativas**:
  - Diseñadas siguiendo exactamente las especificaciones de Brave WebUI (`brave://settings`, `brave://history`, `brave://downloads`, etc.).

---

## 6. Empaquetado, Portabilidad y Distribución

Para facilitar su uso sin necesidad de configurar entornos de desarrollo, se implementó un pipeline automatizado con `electron-builder`:

1. **Compilación de Código TypeScript**:
   ```powershell
   npm run build
   ```
   Utiliza `esbuild` para transpolar y empaquetar `main.ts` en un único archivo ESM ultra optimizado (`dist/main.mjs`).

2. **Generación de Binario Portable**:
   ```powershell
   npm run portable
   ```
   Genera los siguientes binarios en el directorio de distribución:
   * **`Brave-Replica-Portable.exe`** (~104 MB): Ejecutable completamente autónomo, no requiere instalación, ideal para pendrives o ejecución rápida en cualquier sistema Windows x64.
   * **`Brave-Replica-Setup.exe`** (~104 MB): Instalador NSIS con soporte para creación de accesos directos y desinstalador estándar de Windows.

3. **Soporte de Git LFS**:
   Los ejecutables se encuentran sincronizados en el repositorio mediante **Git Large File Storage (LFS)** con la regla `.gitattributes`:
   ```gitattributes
   *.exe filter=lfs diff=lfs merge=lfs -text
   ```

---

## 7. Control de Versiones y Repositorio Oficial

El código fuente completo de la réplica, junto con su documentación, recursos gráficos, suite de pruebas y binarios compilados, se encuentra alojado y publicado en:

* **Repositorio GitHub Oficial:** [https://github.com/themiguedev/replik](https://github.com/themiguedev/replik)
* **Rama Principal:** `main`
* **Licencia:** MIT (Uso educativo y de investigación de software libre)

---

## 8. Conclusiones y Logros Educativos

1. **Comprensión Profunda de la Privacidad Web**: Se desmitificó el funcionamiento de los motores de bloqueo de anuncios modernos, demostrando que la privacidad no depende únicamente de rechazar peticiones DNS, sino de una orquestación precisa entre filtrado de red, inyección cosmética, sustitución de recursos y neutralización de huellas biométricas de hardware/APIs.
2. **Arquitectura Limpia y Modular**: La separación entre el motor de reglas (`brave-shields`) y el cliente gráfico (`brave-desktop`) permite que el motor de filtrado pueda ser reutilizado en proxies HTTP, extensiones de navegador o navegadores personalizados independientes.
3. **Reproducibilidad y Fidelidad**: Se logró una experiencia de usuario que emula fielmente la respuesta, estética y comportamiento del producto original, convirtiendo el proyecto en un caso de estudio de alta calidad para la comunidad de ingeniería de software y seguridad informática.
