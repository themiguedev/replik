# Réplica Educativa de Brave Browser (Brave Architecture Replica)

Esta réplica de escritorio ha sido diseñada y construida con fines educativos para analizar y experimentar directamente con la arquitectura interna de **Brave Browser** y su subsistema insignia: **Brave Shields**.

---

## 🏗️ Mapeo Arquitectónico: Brave-Core vs Réplica Educativa

| Componente | Brave Oficial (`brave-core` / Chromium) | Nuestra Réplica Educativa (`reconstruction/`) |
| :--- | :--- | :--- |
| **Núcleo de Renderizado** | Chromium Blink / V8 (C++) | Chromium Webview Engine (Electron v45) |
| **Motor de Bloqueo de Red** | `adblock-rust` + C++ bindings en `brave::URLRequestFilter` | `BraveShieldsEngine` + `session.webRequest.onBeforeRequest` |
| **Limpieza de URLs (De-AMP / Tracking)**| `brave::QueryFilter` (`query-filter.json`) | `QueryStripper` (`reconstruction/brave-shields/src/query-stripper.ts`) |
| **Filtrado Cosmético (Ocultación CSS)**| Inyección de hojas de estilo en `content::RenderFrame` | `CosmeticFilterEngine` + `webContents.insertCSS` |
| **Sucedáneos (Surrogates / Redirection)**| Recursos sustitutos en `resources.json` (1x1.gif, noop.js) | `ResourceCatalog` con Data URIs |
| **Interfaz de Usuario (Omnibox & Shields)**| Chromium Views Framework / WebUI | HTML5, CSS3 moderno (paleta oficial Brave) y JavaScript |

---

## 🚀 Cómo Ejecutar la Réplica

Desde la raíz del proyecto, simplemente ejecuta:

```powershell
npm run brave
```

El navegador se abrirá con:
1. **Pestañas y Omnibox**: Barra de navegación funcional hacia cualquier sitio web o búsqueda rápida en Brave Search.
2. **Botón del León de Brave Shields**:
   - Muestra en tiempo real el contador de anuncios y rastreadores bloqueados.
   - Panel emergente interactivo para ver estadísticas detalladas.
   - Switch ON/OFF para desactivar o reactivar los escudos en el dominio activo.
3. **Carga en vivo de filtros oficiales**:
   - Lee automáticamente las reglas de producción de tu instalación de Brave (`iodkpdagapdfkphljnddpjlldadblomo\list.txt` y `query-filter.json`).

---

## 🛠️ Guía de Modificación y Extensión

### 1. Agregar o modificar parámetros de rastreo
Edita [`reconstruction/brave-shields/src/query-stripper.ts`](file:///d:/Usuarios/UCE.FCBA/Documents/New%20REA/reconstruction/brave-shields/src/query-stripper.ts) o añade reglas a `main.ts` en `initShieldsRules`:
```typescript
shieldsEngine.loadQueryFilterRules([
  {
    include: ['*://*/*'],
    exclude: [],
    params: ['mi_parametro_tracking', 'fbclid', 'gclid'],
  },
]);
```

### 2. Personalizar reglas de bloqueo o excepciones
Añade reglas personalizadas en formato EasyList en [`reconstruction/brave-desktop/main.ts`](file:///d:/Usuarios/UCE.FCBA/Documents/New%20REA/reconstruction/brave-desktop/main.ts):
```typescript
shieldsEngine.loadRulesFromText(`
  ||sitio-anuncios.com^$third-party
  @@||sitio-anuncios.com/permitido.js
  ##.banner-publicidad
`);
```

### 3. Personalizar la interfaz gráfica del León y colores
Los estilos visuales se encuentran en [`reconstruction/brave-desktop/ui/style.css`](file:///d:/Usuarios/UCE.FCBA/Documents/New%20REA/reconstruction/brave-desktop/ui/style.css) y la lógica de interacción en [`reconstruction/brave-desktop/ui/renderer.js`](file:///d:/Usuarios/UCE.FCBA/Documents/New%20REA/reconstruction/brave-desktop/ui/renderer.js).
