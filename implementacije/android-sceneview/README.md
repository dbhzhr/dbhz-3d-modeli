# android-sceneview — Kotlin + Jetpack Compose + SceneView (Filament)

Nativni Android port `docs/VIEWER-SPEC.md` po planu `docs/04-android-kotlin.md`:
**kamera je fiksna** (8° elevacije, fovY 40°), a rotira se **MODEL oko Y osi** —
identičan vizualni rezultat kao orbit-lock na webu, uz najjednostavniju izvedbu.

## Pinane verzije

SceneView **4.21.2** (Filament + Compose) · Kotlin **2.4.0** (⚠️ SceneView
4.21.2 je kompajliran Kotlinom 2.4 — starije verzije rone u
`IncompatibleClassVersion` greške) · AGP 8.10.1 · Gradle 8.14.2 ·
compose-bom 2024.12 · minSdk 24, compile/targetSdk 36.

## Pokretanje

```bash
cd implementacije/android-sceneview
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Kako je spec pokriven

| Spec | Izvedba |
|---|---|
| Rotacija samo oko Y, polar fiksan | kamera se NE miče (elevacija 8°); drag (`onScroll`) → kutna brzina modela, damping `e^(−4·dt)`; auto-rotate 5.45°/s nakon 1.5 s mira |
| Zoom 2.2–9, samo udaljenost | pinch (`onScale`) mijenja udaljenost kamere s clampom |
| fovY 40° | `focalLength = 12/tan(20°) ≈ 33 mm` (Filament 35 mm ekvivalent) |
| FitCamera | spec formula u `refitCamera()` na `onSizeChanged` + nakon učitavanja modela (bbox iz `FilamentAsset.boundingBox`) |
| Animirani prijelaz materijala | Filament `MaterialInstance.setParameter("baseColorFactor"/"metallicFactor"/"roughnessFactor")` lerp u `onFrame` (`k = 1 − e^(−4.5·dt)`) |
| Fullscreen na root razini | `Dialog(usePlatformDefaultWidth=false, decorFitsSystemWindows=false)` s **novom SceneView instancom** (vlastiti Engine — scena se ne dijeli); varijanta hoistana pa se prenosi |
| Swatchevi + zlatni prsten + caveat | Compose overlay (`Spec` objekt drži sve vrijednosti) |

## Naučene zamke

1. **Kotlin verzija mora pratiti SceneView** — 4.21.2 traži Kotlin 2.4.0
   (metadata 2.4.0); s 2.1 sve SceneView reference "ne postoje".
2. **`FilamentInstance.materialInstances` je Java član (Array)**, ne SceneView
   Kotlin ekstenzija (Map) — član ima prednost u resoluciji; iterira se
   direktno po arrayju.
3. Ekstenzije poput `instance.model` treba eksplicitno importati
   (`io.github.sceneview.model.model`).
4. GLB mora imati **materijal i normale** — koristi se derivat iz
   `implementacije/web-model-viewer` (izvorni GLB nema ni jedno ni drugo;
   gltfio bez materijala nema podesive faktore).

## Dokumentirana odstupanja

- Osvjetljenje: SceneView 4.x default (main + fill light, neutralan IBL)
  umjesto spec postave (poglavlje 5) — vizualno blizu, nije 1:1.
- Nema meke kontaktne sjene ispod modela (spec 5) — izvedivo s
  shadow-receiver plohom, ostavljeno kao TODO.
- AR nije uključen (SceneView ima `ARSceneView`/Scene Viewer intent — bonus
  za kasnije).

## Verificirano na uređaju (Motorola Edge 30 Ultra, Android 15)

Render + kadar u portretu, animirani prijelaz bronca↔kamen, auto-rotacija,
horizontalni drag rotira / vertikalni NE mijenja polar, fullscreen dialog
(prekriva sve, safe-area kontrole, izlaz vraća stanje, varijanta se prenosi).

## Ubacivanje u POSTOJEĆU Android aplikaciju (copy-paste)

1. `implementation("io.github.sceneview:sceneview:4.21.2")` + Kotlin 2.4.0.
2. Kopiraj `Spec` objekt i `BistaViewer` composable iz
   `app/src/main/java/com/stepanic/muzej3d/MainActivity.kt` te asset
   `app/src/main/assets/models/tomislav-bista.glb`.
3. `BistaViewer(variant, onVariant, fullscreen, onToggleFullscreen)` je
   samostalan composable — hoistaj varijantu i fullscreen state gdje ti
   odgovara (v. `MainActivity.setContent` kao primjer).

## Napomena o modelu

Model je ilustrativna 3D digitalizacija — atribucija skulpture nije potvrđena
(v. `modeli/tomislav-bista/README.md`); napomena je prikazana u UI-ju viewera.
