import fs from 'node:fs';
import path from 'node:path';
import { BraveShieldsEngine } from './src/shields-engine.js';

const BRAVE_USER_DATA =
  'D:\\Usuarios\\UCE.FCBA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data';

async function main() {
  console.log('=== Brave Shields Engine (Reconstruido & Verificado) ===\n');

  const engine = new BraveShieldsEngine();

  // 1. Cargar reglas de red y cosméticas desde el componente oficial de Brave
  const filterListPath = path.join(
    BRAVE_USER_DATA,
    'iodkpdagapdfkphljnddpjlldadblomo',
    '1.0.23118',
    'list.txt'
  );

  if (fs.existsSync(filterListPath)) {
    console.log(`[+] Leyendo reglas desde: ${filterListPath}`);
    // Tomamos una muestra de 10,000 reglas para inicialización ultrarrápida
    const content = fs.readFileSync(filterListPath, 'utf-8');
    const lines = content.split(/\r?\n/).slice(0, 10000).join('\n');
    const parsed = engine.loadRulesFromText(lines);
    console.log(
      `    Reglas parseadas: ${parsed.network} de red, ${parsed.cosmetic} cosméticas, ${parsed.scriptlets} scriptlets.`
    );
  }

  // 2. Cargar Query Filter (Des-rastreo de URLs)
  const queryFilterPath = path.join(
    BRAVE_USER_DATA,
    'cemdlagocoimleflkfkjoihojfainiho',
    '1.0.191',
    'query-filter.json'
  );

  if (fs.existsSync(queryFilterPath)) {
    console.log(`[+] Leyendo reglas de Query Stripping desde: ${queryFilterPath}`);
    const queryRules = JSON.parse(fs.readFileSync(queryFilterPath, 'utf-8'));
    engine.loadQueryFilterRules(queryRules);
  }

  console.log('\n--- PRUEBA 1: Filtrado de Peticiones de Red ---');
  const requests = [
    {
      url: 'https://adservice.google.com/adsid/integrator.sync.js',
      documentUrl: 'https://elpais.com/noticias',
      resourceType: 'script' as const,
    },
    {
      url: 'https://static.elpais.com/dist/bundle.js',
      documentUrl: 'https://elpais.com/noticias',
      resourceType: 'script' as const,
    },
    {
      url: 'https://tracking.adsystem.com/beacon.gif',
      documentUrl: 'https://blog.com',
      resourceType: 'image' as const,
    },
  ];

  for (const req of requests) {
    const res = engine.interceptRequest(req);
    console.log(`URL: ${req.url}`);
    console.log(`  -> Acción: [${res.action.toUpperCase()}] (${res.reason})`);
  }

  console.log('\n--- PRUEBA 2: Limpieza de Parámetros de Rastreo (Query Stripping) ---');
  const dirtyUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=track_token_sample&t=42',
    'https://tienda.com/producto?id=9981&gclid=CjwKCAjws_...&fbclid=IwAR2...&ref=promo',
    'https://instagram.com/p/B12345678/?igsh=token_sample&utm_source=ig_web',
  ];

  for (const dirty of dirtyUrls) {
    const clean = engine.cleanUrl(dirty);
    console.log(`Original: ${dirty}`);
    console.log(`Limpia:   ${clean.cleanUrl}`);
    console.log(`Eliminados: [${clean.strippedParams.join(', ')}]\n`);
  }

  console.log('--- PRUEBA 3: Filtrado Cosmético (Inyección CSS en el DOM) ---');
  const cosmetics = engine.injectCosmetics('youtube.com');
  console.log(`Selectores activos para youtube.com: ${cosmetics.selectors.length}`);
  console.log(`Scriptlets activos: ${cosmetics.scriptlets.length}`);
  if (cosmetics.selectors.length > 0) {
    console.log(`Muestra de CSS inyectado:\n${cosmetics.css.substring(0, 180)}...`);
  }
}

main().catch(console.error);
