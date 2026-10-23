# 🦁 Replik — Brave Browser Desktop Replica

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Platform: Windows x64](https://img.shields.io/badge/Platform-Windows%20x64%20Portable-blue.svg)]()
[![Electron](https://img.shields.io/badge/Engine-Chromium%20%2F%20Electron-brightgreen.svg)]()

> **Replik** es una réplica educativa integral de **Brave Browser** para Windows x64. Implementa el diseño visual oficial de Brave Desktop (Chromium Dark Theme) junto a su motor de protección de privacidad **Brave Shields**, bloqueo de rastreadores y anuncios, navegación con Tor, protocolos descentralizados IPFS/IPNS y utilidades avanzadas de productividad en un único binario 100% portable.

---

## 🚀 Descargas Disponibles

Elige la versión que mejor se adapte a tu uso:

* 📦 **[Descargar Brave-Replica-Portable.exe (Portable)](https://github.com/themiguedev/replik/releases/latest)** (~104 MB): Ejecutable autónomo sin instalación previa.
* 💿 **[Descargar Brave-Replica-Setup.exe (Instalador)](https://github.com/themiguedev/replik/releases/latest)** (~104 MB): Instalador guiado NSIS con accesos directos al Menú Inicio y Escritorio.

Ambos binarios también se encuentran versionados en la raíz del repositorio con soporte de **Git LFS**.

---

## ✨ Características Principales

### 🛡️ 1. Seguridad y Control de Datos
* **Motor de Bloqueo de Anuncios y Rastreadores**: Reglas de EasyList + uBlock Origin integradas de alta velocidad.
* **Selector Visual de Bloqueo de Elementos (`Ctrl + Shift + E`)**: Modo de inspección visual interactivo para seleccionar cualquier elemento de una página, bloquearlo al instante y generar reglas cosméticas permanentes.
* **Limpiador Avanzado de Datos de Navegación (`Ctrl + Shift + Supr`)**: Diálogo completo con selección de rango temporal (1h, 24h, 7d, 4w, todo) y control granular de caché, cookies, almacenamiento local, permisos e historial.
* **Bloqueo de Scripts por Defecto**: Desactiva la ejecución de JavaScript en sitios no esenciales con interruptor dinámico por dominio.
* **Navegación Olvidadiza (Forgetful Browsing)**: Limpieza automática de cookies, almacenamiento local y caché al cerrar la última pestaña de un dominio.
* **Protección contra Escaneo de Red Local**: Bloqueo de peticiones no autorizadas desde páginas web hacia `localhost`, `127.0.0.1` o redes privadas (LAN).
* **HTTPS Everywhere Forzado**: Actualización automática de conexiones HTTP a HTTPS cifrado.
* **Farbling Avanzado Anti-Fingerprinting**: Inyección de micro-ruido dinámico en `Canvas`, `AudioBuffer`, `AnalyserNode` y enmascaramiento de GPU en `WebGL/WebGL2`.
* **Des-Rastreo y Salto Directo de Redirecciones (De-AMP & Direct URL Bypass)**: Salto automático de enlaces de rastreo intermedios.
* **Gestor de Permisos de Sitio en el Candado**: Panel interactivo con interruptores para Cámara, Micrófono, Notificaciones, Ubicación, Portapapeles y JavaScript.

### 🎨 2. Personalización Visual y Diseño 1:1 Oficial
* **Selector de Tema Dinámico**: Alterna fluidamente entre modo **Oscuro** (predeterminado carbón `#1f1f23`), modo **Claro** (`#ffffff` / `#f1f3f4`) y modo **Automático** sincronizado con Windows.
* **Paletas de Color de Acento**: Elige entre Naranja Brave (`#fb542b`), Morado Eléctrico (`#7d34fe`), Azul Océano (`#1a73e8`), Verde Esmeralda (`#00b894`) y Rojo Carmesí (`#ea4335`).
* **Barra de Título Frameless con Controles Nativos**: Minimizar (`—`), Maximizar (`▢`) y Cerrar (`✕`) estilo Windows 11 con detección de arrastre y doble clic.
* **Pestañas y Toolbar Unificadas**: Continuidad visual fluida en gris carbón sin bordes ni separaciones toscas.
* **Iconos Vectoriales SVG Profesionales**: Flechas de navegación, recarga/detención dinámica, candado de seguridad, pieza de puzzle de extensiones, perfil y menú de opciones.
* **Página de Nueva Pestaña (NTP)**: Panel superior de 3 métricas de ahorro (*Rastreadores bloqueados*, *Banda ancha ahorrada* y *Tiempo ganado*), reloj estético, buscador Brave y accesos directos.

### ⚡ 3. Resiliencia de Sesión y Multitarea
* **Restauración Completa de Sesión ("Continuar donde lo dejaste")**: Guarda el estado de todas las pestañas abiertas y fijadas, restaurándolas al reiniciar el navegador de manera automática (configurable en Ajustes).
* **Crash Recovery ante Caídas de Proceso (`render-process-gone`)**: Banner amarillo superior con detección automática de caídas de pestañas y botón directo de recuperación ("Volver a cargar").
* **Soporte de Autenticación HTTP Básica**: Diálogo modal interactivo para acceso a routers locales (`192.168.1.1`), servidores proxy y sitios con `.htaccess`.
* **Divisor Arrastrable en Pantalla Dividida (Split View Resizer)**: Separador interactivo entre pestañas paralelas con ajuste fino y doble clic para restablecer la proporción al 50%/50%.
* **Ahorro de Memoria (Memory Saver / Sleeping Tabs)**: Suspensión automática de pestañas en segundo plano y reactivación instantánea al seleccionarlas.
* **Tarjetas Flotantes (Tab Hover Cards)**: Previsualización de miniaturas y consumo estimado de memoria RAM al pasar el cursor sobre las pestañas.
* **Caché Instantáneo Atrás / Adelante (BFCache)**: Navegación inmediata preservando el estado DOM y posición de scroll.
* **Silenciar Pestañas con 1 Clic**: Indicador de audio dinámico sobre el favicon de la pestaña para silenciar o reactivar el sonido.
* **Pestañas Fijadas Auténticas**: Pestañas compactas protegidas contra cierre accidental y restauradas automáticamente en el inicio.
* **Reabrir Pestañas Cerradas (`Ctrl + Shift + T`)**: Pila de recuperación de pestañas cerradas recientemente con su historial.
* **Control de Zoom Persistente**: Ajuste fino con `Ctrl +`, `Ctrl -`, `Ctrl 0` y `Ctrl + Scroll` de ratón con memoria por dominio e indicador interactivo en el Omnibox.

### 🛠️ 4. Productividad, Descargas y Autocompletado
* **Pipeline Nativo de Descargas**: Captura del evento `will-download`, barra inferior no flotante con progreso en vivo, tamaño, porcentaje, botón para cancelar descargas en curso, botones *"Abrir archivo"* y *"Mostrar en carpeta"*, y registro en vivo en `brave://downloads`.
* **Gestor Visual de Marcadores (`brave://bookmarks`)**: Panel integral para administrar marcadores, crear carpetas, buscar favoritos y función de **Importar y Exportar marcadores en formato HTML estándar**.
* **Página de Información y Diagnóstico (`brave://version`)**: Vista auténtica estilo Chromium con versiones exactas de Brave Replica, Chromium, Electron, Node.js, V8, User-Agent y rutas de perfiles.
* **Autocompletado de Formularios y Perfil Personal**: Guarda datos de contacto (Nombre, Email, Teléfono, Dirección postal) en ajustes locales cifrados y autocompleta formularios web con un solo clic.
* **Sincronización Bidireccional de Páginas Internas**: Conexión directa entre el navegador y las páginas `brave://history`, `brave://downloads`, `brave://settings` y la Nueva Pestaña (NTP con estadísticas reales de Brave Shields).
* **Controles Multimedia Globales (Media Keys / Windows SMTC)**: Detección de teclas multimedia del teclado para pausar o reanudar audio y video en segundo plano.
* **Ergonomía Avanzada de Ratón y Omnibox**: Selección automática de texto en el Omnibox al enfocar o hacer clic, zoom mediante `Ctrl + Scroll`, botones laterales Mouse 4 y Mouse 5 para Atrás / Adelante, y apertura de enlaces en segundo plano mediante clic central (rueda) sin robar el foco.
* **Gestor Local de Contraseñas y Autocompletado**: Detección de envíos de formularios, aviso flotante para guardar credenciales, autocompletado en páginas web y panel de administración en configuración.
* **Atajos de Búsqueda Rápidos (!bangs y :)**: Búsqueda instantánea desde el Omnibox con `:g` / `!g` (Google), `:yt` / `!yt` (YouTube), `:w` / `!w` (Wikipedia), `:ddg` / `!ddg` (DuckDuckGo), `:gh` / `!gh` (GitHub), `:b` / `!b` (Brave Search), `:r` / `!r` (Reddit) y `:m` / `!m` (Google Maps).
* **Brave Speedreader Inteligente**: Extracción avanzada con heurísticas Readability para artículos limpios, tiempo estimado de lectura y filtrado de elementos distractores.
* **Nueva Pestaña (NTP) Personalizable**: Galería de fondos fotográficos rotativos de alta calidad, toggles para reloj y estadísticas en vivo, y gestor de accesos directos personalizados.
* **Captura de Pantalla Web Nativa (Brave Web Capture)**: Herramienta de recorte con atajo `Ctrl + Shift + S`, vista previa flotante, copia directa al portapapeles y guardado como PNG.
* **Impresión Nativa y Guardar como PDF (`Ctrl + P`)**: Diálogo de impresión de Chromium para impresión física o exportación a PDF vectorial.
* **Búsqueda Interna en la Página (`Ctrl + F`)**: Barra flotante con contador de coincidencias en tiempo real y navegación anterior/siguiente.
* **Integración con Wayback Machine**: Detección de errores 404/red con botón directo para ver la versión archivada en Internet Archive.
* **Generador de Códigos QR**: Generación de códigos QR vectoriales para compartir páginas rápidamente a dispositivos móviles.
* **Modo Imagen en Imagen Nativo (PiP)**: Ventana flotante desacoplada para reproducir vídeos de YouTube u otras plataformas mientras navegas.
* **Soporte para Extensiones**: Gestor de extensiones Chromium compatibles mediante carga de extensiones desempaquetadas, archivos CRX o carpetas ZIP.
* **Navegación Descentralizada**: Resolución nativa de identificadores descentralizados `ipfs://` e `ipns://`.

---

## ⌨️ Atajos de Teclado Principales

| Atajo | Acción |
| :--- | :--- |
| `Ctrl + T` | Abrir nueva pestaña |
| `Ctrl + W` | Cerrar pestaña activa |
| `Ctrl + Shift + T` | Reabrir última pestaña cerrada |
| `Ctrl + Tab` / `Ctrl + Shift + Tab` | Alternar entre pestañas |
| `Ctrl + 1` ... `Ctrl + 8` | Ir a la pestaña en esa posición |
| `Ctrl + 9` | Ir a la última pestaña |
| `Ctrl + L` / `Alt + D` | Enfocar la barra de direcciones (Omnibox) |
| `Ctrl + R` / `F5` | Recargar página (`Ctrl + Shift + R` sin caché) |
| `Ctrl + F` | Buscar en la página web |
| `Ctrl + Shift + E` | Selector visual de bloqueo de elementos (Element Picker) |
| `Ctrl + Shift + Supr` | Borrar datos de navegación (Caché, cookies, historial) |
| `Ctrl + Shift + S` | Captura de pantalla web (Web Capture) |
| `Ctrl + P` | Imprimir / Guardar como PDF |
| `Ctrl + +` / `Ctrl + -` / `Ctrl + 0` | Aumentar, reducir o restablecer zoom |
| `Ctrl + D` | Guardar en marcadores |
| `Ctrl + Shift + B` | Mostrar/ocultar barra de marcadores |
| `Ctrl + H` | Abrir Historial de navegación |
| `Ctrl + J` | Abrir Descargas |
| `Ctrl + ,` | Abrir Configuración |
| `Ctrl + Shift + N` | Nueva ventana privada |
| `Alt + Shift + N` | Nueva ventana privada con Tor |
| `Alt + S` | Alternar pantalla dividida (Split View) |
| `F11` | Modo pantalla completa |
| `F12` | Herramientas de desarrollador (DevTools) |

---

## 🛠️ Desarrollo y Compilación Local

Si deseas compilar la aplicación desde el código fuente:

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar en modo desarrollo
npm start

# 3. Compilar el bundle principal
npm run build

# 4. Generar el ejecutable portable para Windows x64
npm run portable
```

El binario generado se ubicará en la raíz del proyecto como `Brave-Replica-Portable.exe`.

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Desarrollado con fines educativos y de investigación en ingeniería de software.
