# web-vanilla — three.js ES modul (bez Reacta)

Port `docs/VIEWER-SPEC.md` kao **jedan ES modul + GLB** — ugradivo u bilo koji
HTML/CMS bez build alata. three.js pinан na `0.169.0` (kao referentna
implementacija), učitava se kroz import map s CDN-a.

## Pokretanje

```bash
cd implementacije/web-vanilla
npx serve .          # ili: python3 -m http.server 8000
# otvori http://localhost:3000 (ES moduli ne rade s file://)
```

Deep-link materijala: `?materijal=bronca|kamen|patina`.

## Ubacivanje u postojeću stranicu / CMS (copy-paste)

1. Kopiraj `bista-viewer.js` i `tomislav-bista.glb` u statičke assete stranice.
2. U `<head>` (ili prije skripte) dodaj import map s pinanim three.js:

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
    }
  }
</script>
```

3. Dodaj kontejner s definiranom visinom i pokreni viewer:

```html
<div id="viewer" style="width:100%;height:480px"></div>
<script type="module">
  import { createBistaViewer } from '/putanja/do/bista-viewer.js';
  createBistaViewer(document.querySelector('#viewer'), {
    modelUrl: '/putanja/do/tomislav-bista.glb',
    defaultVariant: 'bronca', // opcionalno
  });
</script>
```

Ako CMS već ima bundler (Vite/webpack): `npm i three@0.169.0`, makni import map
i importaj modul normalno — kod je identičan.

### API

`createBistaViewer(container, { modelUrl, defaultVariant? })` vraća:

- `setVariant('bronca'|'kamen'|'patina')` / `getVariant()`
- `toggleFullscreen()` — nativni Fullscreen API, s fallbackom na overlay
  appendan na `document.body` (iOS Safari); druga instanca scene = klon modela
- `dispose()` — počisti WebGL kontekst i DOM

## Ponašanje (iz VIEWER-SPEC)

- Rotacija SAMO oko vertikalne osi; polar fiksan 8° iznad horizonta; pan
  isključen; zoom 2.2–9; auto-rotate 0.9 s dampingom.
- 3 materijala s animiranim prijelazom (`k = 1 − e^(−4.5·dt)`, ~1 s).
- FitCamera na svaki resize/fullscreen — model uvijek cijeli u kadru.
- Sve spec vrijednosti u jednoj `SPEC` konstanti u `bista-viewer.js`.

## Napomena o modelu

Model je ilustrativna 3D digitalizacija — atribucija skulpture nije potvrđena
(v. `modeli/tomislav-bista/README.md`); napomena je prikazana i u UI-ju viewera.
