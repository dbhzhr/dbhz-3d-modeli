# Plan: iOS nativno (Swift / SwiftUI)

*Stanje 2026-07: **SceneKit je službeno soft-deprecated (WWDC 2025)** — samo
kritični bugfixevi. Sve novo raditi na **RealityKit + SwiftUI**
([migracija](https://dev.to/arshtechpro/wwdc-2025-scenekit-deprecation-and-realitykit-migration-a-comprehensive-guide-for-ios-developers-o26)).*

## Asset strategija (ključna odluka)

RealityKit je USD-first; glTF ne učitava nativno. Dvije opcije:

| | Opcija A: USDZ derivat | Opcija B: GLTFKit2 runtime |
|---|---|---|
| Kako | GLB → USDZ jednom, offline (Reality Converter / `usdzconvert`) | [GLTFKit2](https://github.com/warrenm/GLTFKit2) učitava GLB → RealityKit entity (podržava RealityKit/visionOS) |
| Pros | nula runtime ovisnosti; AR Quick Look besplatno (`QLPreviewController`) | GLB ostaje jedini izvor istine; bez konverzijskog koraka |
| Cons | dvostruki asset (sync burden) | vanjska ovisnost |

Preporuka: **A za katalog/AR, B kad app dinamički vuče modele s backenda.**
Ovaj repo drži GLB kao izvor istine; USDZ generirati u CI koraku.

## Plan implementacije po VIEWER-SPEC-u (RealityKit + SwiftUI)

1. **Prikaz**: `RealityView` (iOS 18+) ili `Model3D` (jednostavni slučajevi);
   pozadina `#0c1c13`, `PerspectiveCamera` fovY 40°, elevacija 8°.
2. **Rotacija „na stolu"**: kamera fiksna → **rotiraj entity oko Y**:
   `DragGesture` → `entity.transform.rotation = simd_quatf(angle: yaw, axis: [0,1,0])`,
   s kutnom brzinom + prigušenjem (spring/timer); auto-rotate `TimelineView` /
   `Entity` sustav komponenta. Polar fiksan by design.
3. **Zoom**: `MagnificationGesture` mijenja udaljenost kamere (clamp 2.2–9 u
   jedinicama modela).
4. **Materijali**: `PhysicallyBasedMaterial` — `baseColor`, `metallic`,
   `roughness` po varijanti iz spec tablice. Lerp: RealityKit materijali se
   postavljaju (ne animiraju) → u `TimelineView`/`CADisplayLink` callbacku
   interpoliraj vrijednosti (`k = 1 − e^(−4.5·dt)`) i reassignaj materijal
   (jeftin — jedan mesh). Alternativa: unaprijed 3 materijala + custom
   `ShaderGraphMaterial` blend parametar.
5. **FitCamera**: `entity.visualBounds(relativeTo:)` → bbox → formula iz spec-a
   → udaljenost kamere; recompute na `GeometryReader` promjenu veličine /
   rotaciju uređaja.
6. **Fullscreen**: `fullScreenCover` (SwiftUI modal preko cijelog ekrana) s
   vlastitim `RealityView` — analogno portal pravilu s weba: overlay na root
   razini, nova instanca scene (entity `clone(recursive: true)`).
7. **AR bonus**: `QLPreviewController` s USDZ-om = AR Quick Look u 10 linija.
8. **Swatchevi/UI**: SwiftUI `HStack` s `Circle()` swatchevima preko viewera
   (`overlay(alignment: .topLeading)`), boje/prsten iz spec-a.

## SceneKit fallback (samo za stare min. targete)

Ako app mora podržati iOS < 15 (rijetko 2026.): SceneKit + `SCNView.allowsCameraControl = false`
+ vlastita yaw rotacija; GLB kroz GLTFSceneKit/GLTFKit2. Ne preporučuje se za novo.

## Isporuka kao modul

Swift Package `Muzej3D` (SwiftUI view `Muzej3DViewer(model: ModelSpec)` +
opcionalna GLTFKit2 ovisnost) → drop-in u postojeće app-ove.
