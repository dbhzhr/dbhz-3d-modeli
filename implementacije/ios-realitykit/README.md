# ios-realitykit — SwiftUI + RealityKit viewer

Nativni iOS port `docs/VIEWER-SPEC.md` po planu `docs/05-ios-swift.md`
(SceneKit je soft-deprecated — sve na RealityKit). **Kamera fiksna** (8°
elevacije, fovY 40°), rotira se **ENTITY oko Y osi**.

## Asset: USDZ derivat

RealityKit je USD-first — koristi se `tomislav-bista.usdz` generiran iz GLB-a
alatom **`alati/glb2usdz.py`** (trimesh + usd-core, bez Xcode alata; prolazi
ARKit compliance check). GLB ostaje izvor istine; USDZ regeneriraj pri
promjeni modela: `python3 alati/glb2usdz.py`.

## Pokretanje

```bash
cd implementacije/ios-realitykit
xcodegen generate          # stvara Muzej3D.xcodeproj iz project.yml (brew install xcodegen)
xcodebuild -project Muzej3D.xcodeproj -scheme Muzej3D \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
# ili otvori Muzej3D.xcodeproj u Xcodeu i pokreni
```

Min. target: iOS 18 (RealityView).

## Kako je spec pokriven

| Spec | Izvedba |
|---|---|
| Rotacija samo oko Y, polar fiksan | kamera se NE miče; `DragGesture` → kutna brzina entityja + damping `e^(−4·dt)`; auto-rotate 5.45°/s nakon 1.5 s mira |
| Zoom 2.2–9, samo udaljenost | `MagnificationGesture` mijenja udaljenost kamere (clamp) |
| fovY 40° | `PerspectiveCamera.camera.fieldOfViewInDegrees = 40` |
| FitCamera | spec formula nad `visualBounds`; refit na promjenu `geo.size` (provjera u frame petlji → radi i na rotaciju ekrana) |
| Animirani prijelaz materijala | `PhysicallyBasedMaterial` reassign u `SceneEvents.Update` petlji (`k = 1 − e^(−4.5·dt)`) — jeftin, jedan mesh |
| Osvjetljenje | 2 `DirectionalLight` po spec smjerovima (key 4,6,5 · topli fill −5,2,−3) |
| Fullscreen na root razini | `fullScreenCover` s NOVOM instancom viewera; varijanta hoistana (prenosi se) |
| Deep-link `materijal` | URL scheme `dbhz3d://materijal/kamen` + `dbhz3d://fullscreen/on\|off` |
| Swatchevi + zlatni prsten + caveat | SwiftUI overlay; sve vrijednosti u `Spec.swift` |

## Naučene zamke (simulator!)

1. **Dvije istovremene RealityView scene na simulatoru ne renderiraju
   pouzdano** — dok je `fullScreenCover` otvoren, inline instanca se zamjenjuje
   placeholderom (spec ionako traži novu instancu, ne dijeljenje scene).
2. **Default osvjetljenje zna nestati nakon rotacije ekrana na simulatoru**
   (model postane crna silueta) — zato eksplicitna svjetla, ne oslanjati se na
   automatski IBL.
3. `onChange(of: geo.size)` nije dovoljan za refit pri rotaciji — veličina se
   provjerava u render petlji.
4. USDZ bez Reality Convertera: `alati/glb2usdz.py` (usd-core) — `usdzconvert`
   ne postoji na stroju, a Xcode ga više ne nosi.

## Verificirano (iPhone 17 Pro simulator, iOS 26.3)

Render + kadar u portretu I landscapeu (rotacija → refit + svjetla OK),
promjena materijala kroz deep-link (bronca→kamen), auto-rotacija (azimut
napreduje između snimki), fullscreen cover preko cijelog ekrana + izlaz +
prijenos varijante. **Needs device testing:** drag/pinch geste i AR Quick
Look (simulator ih ne može sintetizirati kroz `simctl`).

## AR Quick Look (bonus)

USDZ iz `modeli/tomislav-bista/` radi s AR Quick Lookom out-of-the-box —
u postojećoj app dovoljno je `QLPreviewController` s URL-om na `.usdz`
(10-ak linija; nije uključeno u ovaj minimalni viewer).

## Ubacivanje u POSTOJEĆU iOS aplikaciju (copy-paste)

1. Kopiraj `Muzej3D/Spec.swift`, `Muzej3D/BistaViewerView.swift` i
   `Muzej3D/Resources/tomislav-bista.usdz` u svoj target (min. iOS 18).
2. Ekran:

```swift
@State private var variant = Spec.variants[0]
@State private var fullscreen = false

BistaViewerView(variant: $variant, fullscreen: false) { fullscreen = true }
    .fullScreenCover(isPresented: $fullscreen) {
        ZStack {
            Spec.background.ignoresSafeArea()
            BistaViewerView(variant: $variant, fullscreen: true) { fullscreen = false }
        }
    }
```

3. Ako app ima vlastiti URL scheme, mapiraj `materijal` parametar po uzoru na
   `Muzej3DApp.onOpenURL`.

## Napomena o modelu

Model je ilustrativna 3D digitalizacija — atribucija skulpture nije potvrđena
(v. `modeli/tomislav-bista/README.md`); napomena je prikazana u UI-ju viewera.
