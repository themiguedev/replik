# 🦁 Replik — Brave Browser Desktop Replica

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Platform: Windows x64](https://img.shields.io/badge/Platform-Windows%20x64%20Portable-blue.svg)]()
[![Electron](https://img.shields.io/badge/Engine-Chromium%20%2F%20Electron-brightgreen.svg)]()

> **Replik** es una réplica educativa integral de **Brave Browser** para Windows x64. Implementa el diseño visual oficial de Brave Desktop (Chromium Dark Theme) junto a su motor de protección de privacidad **Brave Shields**, bloqueo de rastreadores y anuncios, navegación con Tor, protocolos descentralizados IPFS/IPNS y utilidades avanzadas de productividad en un único binario 100% portable.

---

## 🚀 Descarga Rápida (Portable)

No requiere instalación ni dependencias externas. Descarga y ejecuta directamente:

* 📦 **[Descargar Brave-Replica-Portable.exe (GitHub Releases)](https://github.com/themiguedev/replik/releases/latest)**
* 💾 **Binario en el repositorio**: [`Brave-Replica-Portable.exe`](Brave-Replica-Portable.exe) (~104 MB)

---

## ✨ Características Principales

### 🛡️ 1. Privacidad y Seguridad Avanzada (Brave Shields)
* **Motor de Bloqueo de Anuncios y Rastreadores**: Reglas de EasyList + uBlock Origin integradas de alta velocidad.
* **Bloqueo de Scripts por Defecto**: Desactiva la ejecución de JavaScript en sitios no esenciales con interruptor dinámico por dominio.
* **Navegación Olvidadiza (Forgetful Browsing)**: Limpieza automática de cookies, almacenamiento local y caché al cerrar la última pestaña de un dominio.
* **Protección contra Escaneo de Red Local**: Bloqueo de peticiones no autorizadas desde páginas web hacia `localhost`, `127.0.0.1` o redes privadas (LAN).
* **HTTPS Everywhere Forzado**: Actualización automática de conexiones HTTP a HTTPS cifrado.
* **Farbling Avanzado Anti-Fingerprinting**: Inyección de micro-ruido dinámico en `Canvas`, `AudioBuffer`, `AnalyserNode` y enmascaramiento de GPU en `WebGL/WebGL2`.
* **Des-Rastreo y Salto Directo de Redirecciones (De-AMP & Direct URL Bypass)**: Salto automático de enlaces de rastreo intermedios.
* **Gestor de Permisos de Sitio en el Candado**: Panel interactivo con interruptores para Cámara, Micrófono, Notificaciones, Ubicación, Portapapeles y JavaScript.

### 🎨 2. Diseño Visual 1:1 Oficial (Brave Desktop Theme)
* **Barra de Título Frameless con Controles Nativos**: Minimizar (`—`), Maximizar (`▢`) y Cerrar (`✕`) estilo Windows 11 con detección de arrastre y doble clic.
* **Pestañas y Toolbar Unificadas**: Continuidad visual fluida en gris carbón (`#1f1f23` y `#2b2d31`) sin bordes ni separaciones toscas.
* **Iconos Vectoriales SVG Profesionales**: Flechas de navegación, recarga/detención dinámica, candado de seguridad, pieza de puzzle de extensiones, perfil y menú de opciones.
* **Página de Nueva Pestaña (NTP)**: Panel superior de 3 métricas de ahorro (*Rastreadores bloqueados*, *Banda ancha ahorrada* y *Tiempo ganado*), reloj estético, buscador Brave y accesos directos.

### 📑 3. Gestión Eficiente de Pestañas y Rendimiento
* **Ahorro de Memoria (Memory Saver / Sleeping Tabs)**: Suspensión automática de pestañas en segundo plano y reactivación instantánea al seleccionarlas.
* **Tarjetas Flotantes (Tab Hover Cards)**: Previsualización de miniaturas y consumo estimado de memoria RAM al pasar el cursor sobre las pestañas.
* **Caché Instantáneo Atrás / Adelante (BFCache)**: Navegación inmediata preservando el estado DOM y posición de scroll.
* **Silenciar Pestañas con 1 Clic**: Indicador de audio dinámico sobre el favicon de la pestaña para silenciar o reactivar el sonido.
* **Pestañas Fijadas Auténticas**: Pestañas compactas protegidas contra cierre accidental y restauradas automáticamente en el inicio.
* **Reabrir Pestañas Cerradas (`Ctrl + Shift + T`)**: Pila de recuperación de pestañas cerradas recientemente con su historial.
* **Control de Zoom Persistente**: Ajuste fino con `Ctrl +`, `Ctrl -`, `Ctrl 0` con memoria por dominio e indicador interactivo en el Omnibox.

### 🛠️ 4. Productividad y Utilidades Integradas
* **Captura de Pantalla Web Nativa (Brave Web Capture)**: Herramienta de recorte con atajo `Ctrl + Shift + S`, vista previa flotante, copia directa al portapapeles y guardado como PNG.
* **Impresión Nativa y Guardar como PDF (`Ctrl + P`)**: Diálogo de impresión de Chromium para impresión física o exportación a PDF vectorial.
* **Búsqueda Interna en la Página (`Ctrl + F`)**: Barra flotante con contador de coincidencias en tiempo real y navegación anterior/siguiente.
* **Integración con Wayback Machine**: Detección de errores 404/red con botón directo para ver la versión archivada en Internet Archive.
* **Generador de Códigos QR**: Generación de códigos QR vectoriales para compartir páginas rápidamente a dispositivos móviles.
* **Modo Imagen en Imagen Nativo (PiP)**: Ventana flotante desacoplada para reproducir vídeos de YouTube u otras plataformas mientras navegas.
* **Brave Speedreader**: Modo lectura limpio y sin distracciones para artículos y noticias.
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
