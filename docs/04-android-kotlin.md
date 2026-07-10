# Plan: Android nativno (Kotlin + Jetpack Compose)

*Stanje 2026-07: jasan pobjednik — **SceneView** (Filament + ARCore, jedina
Compose-native 3D biblioteka; aktivni releaseovi, zadnji 6/2026; ima llms.txt
i MCP server pa AI asistenti generiraju ispravan kod).*

## Preporučeni stack

- [SceneView](https://github.com/sceneview/sceneview) (`io.github.sceneview:sceneview`)
  — Filament render, GLB/glTF direktno, `Scene {}` composable.
- Alternativa niže razine: goli [Filament](https://github.com/google/android-filament)
  (`filament-android` + `gltfio`) — više kontrole, više boilerplatea; SceneView
  je Filament s baterijama.
- AR bonus: `ARSceneView` (ARCore) ili intent na Scene Viewer s GLB URL-om.
- Ako app cilja Android XR: [Jetpack XR SDK — Add 3D models](https://developer.android.com/develop/xr/jetpack-xr-sdk/add-3d-models).

## Plan implementacije po VIEWER-SPEC-u

1. **Model**: `sceneview` `ModelNode(modelInstance = modelLoader.createModelInstance("models/tomislav-bista.glb"))`
   — GLB u `assets/`; model je već centriran/normaliziran (pipeline iz ovog repoa).
2. **Rotacija „na stolu"**: kamera fiksna (elevacija 8°, fovY 40°, udaljenost iz
   FitCamera formule) → **rotiraj `ModelNode` oko Y**:
   `detectDragGestures { change, drag -> yawDeg += drag.x * factor }` + damping
   i auto-rotate (`LaunchedEffect` ticker, ~5.5°/s). Polar je fiksan jer kameru
   nitko ne miče — najjednostavnija moguća izvedba spec-a.
3. **Zoom**: pinch (`detectTransformGestures`) mijenja udaljenost kamere u
   granicama 2.2–9 (skalirano na jedinice modela).
4. **Materijali**: Filament `MaterialInstance` po varijanti —
   `setParameter("baseColorFactor", r, g, b, 1f)`, `metallicFactor`,
   `roughnessFactor`. Lerp u `Choreographer`/frame callbacku:
   `k = 1 − exp(−4.5 * dt)`. (gltfio materijal instance su dostupne po
   primitive-u — postaviti na sve.)
5. **FitCamera**: bbox iz `ModelInstance.boundingBox` → formula iz spec-a →
   udaljenost kamere; poziv na promjenu veličine composablea
   (`onSizeChanged`) i orijentacije.
6. **Fullscreen**: novi full-screen `Dialog`/destination (Navigation Compose) s
   vlastitim `Scene` composableom + immersive mode
   (`WindowInsetsController.hide(systemBars)`). Ne dijeliti istu Filament scenu
   između dva viewa — nova instanca, model se učita iz keša.
7. **Swatchevi/UI**: običan Compose `Row` s tri `Box` swatcha preko `Scene`
   (Box + zIndex), boje i aktivni prsten iz spec-a.

## Isporuka kao modul

Zapakirati kao mali Android library modul `:muzej3d` (SceneView dep + viewer
composable `Muzej3DViewer(model: ModelSpec)`) → drop-in za postojeće app-ove.

## Rizici / napomene

- SceneView major verzije znaju mijenjati API — pinati verziju, pratiti release notes.
- Filament `.filamat` custom materijali nisu potrebni: gltfio-ov default lit
  materijal + faktori pokrivaju spec (model nema teksture).
- Stariji View-based put (`SceneView` XML view) postoji ako app nije na Composeu.
