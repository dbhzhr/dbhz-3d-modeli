# Plan: Flutter

*Stanje 2026-07: dva realna puta; three_dart je ustajao, flutter_scene
(Impeller) još nije produkcijski — ne računati na njih.*

## Put 1 — `model_viewer_plus` (katalog, ~pola dana)

[model_viewer_plus](https://pub.dev/packages/model_viewer_plus) = Flutter widget
koji u WebView ugrađuje Googleov `<model-viewer>`.

```dart
ModelViewer(
  src: 'assets/modeli/tomislav-bista.glb',
  cameraControls: true,
  autoRotate: true,
  minCameraOrbit: 'auto 82deg auto',   // polar lock: isti kut u min i max
  maxCameraOrbit: 'auto 82deg auto',
  disablePan: true,
  ar: true,                            // Scene Viewer / Quick Look
)
```

- ✅ GLB direktno, AR besplatno, radi na Android/iOS/web
- 🟡 animirani prijelaz materijala i FitCamera iz VIEWER-SPEC zahtijevaju
  custom JS injection u WebView (izvedivo — `<model-viewer>` ima material API —
  ali tada raste kompleksnost i Put 2 postaje privlačniji)

## Put 2 — Thermion (Filament u Flutteru, puna kontrola)

[Thermion](https://thermion.dev/) (bivši flutter_filament): Filament engine s
Dart API-jem, glTF podrška, radi u Flutteru na svim platformama.

Plan implementacije po spec-u:
1. `ThermionViewer` + `loadGlb('assets/tomislav-bista.glb')`.
2. Kamera fiksna (8° elevacije, fovY 40°); **rotacija modela oko Y** kroz
   `GestureDetector` (horizontalni drag → kutna brzina, damping, auto-rotate
   timer kad nema interakcije).
3. Materijal: Filament material instance — `baseColor/metallic/roughness` po
   varijanti iz spec tablice; lerp u ticker callbacku (`k = 1 − e^(−4.5·dt)`).
4. FitCamera: bbox modela → formula iz spec-a → postavi udaljenost kamere na
   `LayoutBuilder`/orijentacijske promjene.
5. Fullscreen: `Navigator.push` full-screen route (Flutter nema containing-block
   problem, ali isto pravilo — nova ruta, ne Stack hack) + `SystemChrome`
   immersive mode.
6. Swatchevi: obična Flutter dugmad (Stack overlay iznad viewera).

- ✅ jedini put do 100% spec vjernosti s native performansama
- 🟡 mlađi ekosustav od Filamenta samog; pratiti releaseove

## Preporuka

Katalog/muzej: **Put 1** danas. Ako Flutter app treba biti glavni digitalni
muzej s punim UX-om iz spec-a: **Put 2 (Thermion)**.

Izvori: [model_viewer_plus](https://pub.dev/packages/model_viewer_plus) ·
[Thermion](https://thermion.dev/)
