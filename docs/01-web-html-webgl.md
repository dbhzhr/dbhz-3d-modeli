# Plan: Web (HTML + WebGL/WebGPU)

*Status: ✅ referentna implementacija postoji i radi —
`referentna-implementacija/web-react-three/`. Ovaj dokument pokriva i varijante
bez Reacta.*

## Opcije

### A) three.js + React Three Fiber (referentna — gotova)
- Vite + React 18 + three 0.169 + `@react-three/fiber@8` + `@react-three/drei@9`.
- Sav spec implementiran: polar lock, FitCamera, 3 materijala s lerpom,
  fullscreen (nativni API + portal fallback), deep-link `?materijal=`.
- Kopiraj `src/BistaViewer.tsx` + GLB; props: `modelUrl`, `elevationDeg`,
  `autoRotate`, `background`, `defaultVariant`.

### B) Vanilla three.js (bez Reacta — za ugradnju bilo gdje)
Plan porta (sve formule u VIEWER-SPEC):
1. `GLTFLoader` + `OrbitControls` iz `three/addons`.
2. Orbit lock: `controls.minPolarAngle = controls.maxPolarAngle = 82°`,
   `enablePan = false`, `autoRotate = true`, damping.
3. Materijal: jedan `MeshStandardMaterial`; u rAF petlji lerp prema aktivnoj
   varijanti (`k = 1 − e^(−4.5·dt)`).
4. FitCamera: na `ResizeObserver` kontejnera primijeni formulu iz spec-a
   (`camera.position.setLength(dist)`).
5. Fullscreen: `requestFullscreen` s fallbackom — overlay div **appendan na
   `document.body`** (ne unutar widgeta!), druga instanca scene = klon
   (`scene.clone(true)`).
6. Isporuka: jedan ES modul (`<script type="module">`) + GLB — ugradivo u
   svaki CMS/statičku stranicu.

### C) `<model-viewer>` web komponenta (najbrži katalog)
```html
<script type="module" src="model-viewer.min.js"></script>
<model-viewer src="tomislav-bista.glb" camera-controls auto-rotate
  min-camera-orbit="auto 82deg auto" max-camera-orbit="auto 82deg auto"
  disable-pan interaction-prompt="none" ar></model-viewer>
```
- Polar lock ide kroz `min/max-camera-orbit` (isti kut u oba = zaključano) ✅
- AR (Scene Viewer / Quick Look) besplatno ✅
- Prijelaz materijala: `model-viewer` ima [material API](https://modelviewer.dev/)
  (`model.materials[0].pbrMetallicRoughness`) — lerp treba ručno u rAF petlji;
  FitCamera djelomično pokriva `camera-orbit`/`field-of-view`. Za muzejski
  katalog gdje je dovoljna rotacija + AR, ovo je najisplativije.

## WebGL vs WebGPU (2026)

WebGL2 ostaje sigurna baza (naš slučaj: 80k trokuta, jedan materijal — WebGL2
je više nego dovoljan). three.js `WebGPURenderer` je zreo i Safari je dobio
WebGPU, ali za ovaj use-case ne donosi ništa — **ne komplicirati**.

## Preporuka

- Digitalni muzej (katalog stranica): **A** (imamo) uz **C** za brze embed
  stranice pojedinog modela s AR-om.
- Za "ubaci u tuđi web": port **B** (vanilla ES modul) — plan gore, ~1 dan posla.
