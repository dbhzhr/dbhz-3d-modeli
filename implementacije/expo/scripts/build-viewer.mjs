// Build web viewera za WebView: bundla ../web-vanilla/bista-viewer.js + three.js
// (esbuild) i GLB kao data URI u JEDAN samodostatan HTML — bez mrežnih zahtjeva,
// radi offline u WebView-u (iOS/Android) i u <iframe srcDoc> na webu.
//
// Izlaz: src/viewerHtml.ts (HTML kao string modul — nema Metro asset trvenja).
// Pokretanje: npm run build:viewer
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const glb = readFileSync(resolve(root, '../../modeli/tomislav-bista/tomislav-bista.glb'));
const glbDataUri = `data:model/gltf-binary;base64,${glb.toString('base64')}`;

const bundle = await build({
  entryPoints: [resolve(here, 'viewer-entry.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  define: { __GLB_DATA_URI__: JSON.stringify(glbDataUri) },
  // 'three' i 'three/addons/*' iz node_modules ovog projekta (pinан 0.169.0)
  alias: {
    'three/addons': resolve(root, 'node_modules/three/examples/jsm'),
    three: resolve(root, 'node_modules/three/build/three.module.js'),
  },
});
const viewerJs = bundle.outputFiles[0].text;

const html = `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #0c1c13; }
  #viewer { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="viewer"></div>
<script>
${viewerJs}
</script>
</body>
</html>`;

mkdirSync(resolve(root, 'src'), { recursive: true });
const threeVersion = JSON.parse(readFileSync(resolve(root, 'node_modules/three/package.json'))).version;
writeFileSync(
  resolve(root, 'src/viewerHtml.ts'),
  `// GENERIRANO — ne uređivati ručno. Regeneracija: npm run build:viewer\n` +
    `// Samodostatan web viewer (three.js ${threeVersion} + GLB kao data URI).\n` +
    `export const viewerHtml = ${JSON.stringify(html)};\n`,
);
console.log(`OK — src/viewerHtml.ts (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
