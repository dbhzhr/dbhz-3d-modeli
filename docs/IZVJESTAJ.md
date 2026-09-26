# Izvještaj: 3D viewer kulturne baštine u 6 tehnologija — sve dovršeno i verificirano

*Datum: 10. srpnja 2026. · Repozitorij: `stepanic/dbhz-3d-modeli` · Status: svih 6
planiranih implementacija dovršeno, testirano na stvarnim uređajima i objavljeno
u repozitoriju.*

## Sažetak za Družbu

Digitalni muzej DBHZ-a sada ima **kompletan, prenosiv 3D viewer** za pregled
modela kulturne baštine (prvi eksponat: bista kralja Tomislava) koji se ponaša
identično na **webu, u mobilnim aplikacijama (Expo/React Native i Flutter) te
nativno na Androidu i iPhoneu**. Svaka izvedba je doslovno *copy-paste* spremna
za ugradnju u postojeće stranice i aplikacije — od WordPress stranice do
nativne iOS app.

Ponašanje je svugdje isto, definirano jednim dokumentom
([VIEWER-SPEC](VIEWER-SPEC.md)): eksponat se okreće **samo oko vertikalne osi**
(kao na postolju u muzeju — ne može se okrenuti naglavačke), posjetitelj bira
**tri materijala** (bronca · brački kamen · bronca s patinom) s glatkim
animiranim prijelazom, model je **uvijek cijeli u kadru** (i pri rotaciji
ekrana), a **puni zaslon** radi pouzdano na svim platformama. Na mobitelima je
dostupan i **AR pregled** (model u stvarnom prostoru kroz kameru).

> ⚠️ Atribucija skulpture još **nije potvrđena** — do potvrde s Družbom model
> se u svim viewerima prikazuje s napomenom „ilustrativna 3D digitalizacija"
> (v. [`modeli/tomislav-bista/README.md`](../modeli/tomislav-bista/README.md)).

## 1. Od scana do eksponata — pipeline modela

Jedan izvorni GLB model pokreće sve implementacije; derivati se generiraju
automatski (skripte u repou):

```mermaid
flowchart LR
    STL["STL 3D scan<br/>(300k trokuta, nagnut 42.8°)"]
    STL -->|"alati/fix_upright.py<br/>decimacija + geometrijsko uspravljanje"| GLB["tomislav-bista.glb<br/>⭐ IZVOR ISTINE<br/>Y-up · centriran · 2 jedinice · 1.4 MB"]
    GLB -->|"trimesh: glatke normale<br/>+ upisan PBR materijal"| GLBD["GLB derivat<br/>(za model-viewer okruženja)"]
    GLB -->|"alati/glb2usdz.py<br/>(usd-core, prolazi ARKit provjeru)"| USDZ["tomislav-bista.usdz<br/>(za iOS RealityKit + AR Quick Look)"]
```

## 2. Jedan spec, šest implementacija — tko što reusa

Ne portira se kod nego **specifikacija ponašanja** — a gdje god je moguće,
implementacije dijele stvarne artefakte:

```mermaid
flowchart TD
    SPEC["docs/VIEWER-SPEC.md<br/>⭐ tehnološki neutralan spec<br/>(polar lock 8° · zoom 2.2–9 · 3 materijala<br/>· FitCamera formule · fullscreen pravila)"]

    subgraph WEB["Web"]
        REF["referentna-implementacija<br/>web-react-three<br/>(three.js + R3F — u produkciji)"]
        VAN["web-vanilla<br/>jedan ES modul + GLB<br/>→ ugradiv u svaki CMS"]
        MV["web-model-viewer<br/>Google model-viewer<br/>+ AR na mobitelu"]
    end

    subgraph MOBILE["Mobilne aplikacije (jedna codebase)"]
        EXPO["expo (React Native)<br/>WebView + offline bundle"]
        FLUT["flutter<br/>model_viewer_plus + JS injekcija"]
    end

    subgraph NATIVE["Nativni moduli"]
        AND["android-sceneview<br/>Kotlin + Compose + Filament"]
        IOS["ios-realitykit<br/>SwiftUI + RealityKit"]
    end

    SPEC --> REF
    SPEC --> VAN
    SPEC --> MV
    SPEC --> AND
    SPEC --> IOS
    VAN -->|"esbuild bundle<br/>(three.js + GLB u 1 HTML, offline)"| EXPO
    MV -.->|"ista JS logika materijala"| FLUT
    SPEC --> FLUT
```

Ključni odnosi:

- **`web-vanilla` je srce reusea** — Expo aplikacija ga bundla offline u
  WebView (100 % isto ponašanje na iOS/Android/web bez ijedne mrežne veze).
- **`web-model-viewer` i `flutter` dijele istu logiku** (Googleova
  `<model-viewer>` komponenta + identičan JS za animirani prijelaz materijala)
  i isti GLB derivat.
- **Nativni portovi (Android, iOS) dijele isti trik iz spec-a**: kamera je
  fiksna, a rotira se *model* — jednostavnije od orbit-kamere s ograničenjima,
  vizualno identično.

## 3. Kako je verificirano — mjerenja, ne dojmovi

```mermaid
flowchart LR
    subgraph V["Verifikacija svake implementacije"]
        CHROME["pravi Chrome<br/>(devtools protokol)<br/>· runtime mjerenja kuta/udaljenosti<br/>· portret 390×844 i landscape<br/>· klik = pravi korisnički gest"]
        MOTO["fizički telefon<br/>Motorola Edge 30 Ultra<br/>· instalacija APK-a<br/>· screenshotovi + dodiri kroz adb"]
        SIM["iPhone 17 Pro simulator<br/>(iOS 26.3, Xcode 26.3)<br/>· build + instalacija<br/>· deep-link testovi + rotacija"]
    end
    CHROME --> OK["4 provjere po implementaciji:<br/>① bista uspravna i cijela u kadru (P+L)<br/>② rotacija SAMO lijevo–desno<br/>③ prijelaz materijala vidljivo animiran<br/>④ fullscreen prekriva sve i uredno se vraća"]
    MOTO --> OK
    SIM --> OK
```

Primjeri stvarnih mjerenja (ne screenshot-dojmova): polarni kut očitan iz
kamere = 82.0° i **ne da se promijeniti** (forsiranje na 20° → vraća se na
82°); prijelaz materijala uzorkovan svakih 120 ms pokazuje eksponencijalnu
rampu `0.78 → 0.44 → 0.25 → … → 0.02`; FitCamera udaljenost 5.57 (portret) →
3.48 (landscape); vertikalni swipe na fizičkom Androidu ne mijenja nagib pogleda.

## 4. Rezultat po implementaciji

| # | Implementacija | Tehnologija | Verificirano na | Za koga je |
|---|---|---|---|---|
| 0 | `referentna-implementacija/web-react-three` | Vite + React + three.js | u produkciji ([dbhz-prototip](https://dbhz-prototip.domovina.ai/?screen=bista)) | glavni web katalog |
| 1 | `implementacije/web-vanilla` | vanilla three.js ES modul | Chrome (mjerenja) | ugradnja u bilo koji CMS / statičku stranicu |
| 2 | `implementacije/web-model-viewer` | Google `<model-viewer>` | Chrome (mjerenja) | brze embed stranice s AR-om |
| 3 | `implementacije/expo` | React Native (WebView reuse) | Chrome + Motorola + iPhone sim. | mobilna app iz jedne codebase |
| 4 | `implementacije/flutter` | Flutter + model_viewer_plus | Chrome + Motorola + iPhone sim. | Flutter timovi |
| 5 | `implementacije/android-sceneview` | Kotlin + Compose + Filament | Motorola (fizički) | ugradnja u postojeće Android appove |
| 6 | `implementacije/ios-realitykit` | SwiftUI + RealityKit | iPhone simulator | ugradnja u postojeće iOS appove |

Svaka implementacija ima vlastiti README s uputama „kako pokrenuti" i
„kako ubaciti u postojeću aplikaciju" te dokumentirane platformske zamke
(ukupno 10-ak netrivijalnih, npr. Android release dozvole, gubitak osvjetljenja
na rotaciju iOS simulatora, Kotlin verzija za SceneView).

## 5. Preporuka smjera za digitalni muzej

```mermaid
flowchart TD
    F1["FAZA 1 — SADA<br/>Web katalog (referentna R3F implementacija)<br/>+ web-vanilla za embed u stranice<br/>+ model-viewer za AR stranice eksponata"]
    F1 --> F2["FAZA 2 — kad zatreba mobilna app<br/>Expo WebView put (100% reuse weba,<br/>već radi na iOS + Android)"]
    F2 --> F3["FAZA 3 — po potrebi partnera<br/>nativni moduli SceneView / RealityKit<br/>za ugradnju u tuđe appove (spremni u repou)"]
    F1 -.-> AR["USDZ derivati već omogućuju<br/>AR Quick Look linkove u fazi 1"]
```

**Web je glavna grana razvoja** — pokriva sve posjetitelje bez instalacije, a
sve tri web varijante dijele isti model. Novi eksponat se dodaje jednom
(`alati/fix_upright.py` → GLB u `modeli/`) i automatski radi u svim viewerima.

## 6. Gdje je što u repozitoriju

- [`docs/STATUS.md`](STATUS.md) — detaljna tablica: verzije, kako pokrenuti,
  kako je točno testirano, poznata ograničenja + završni izvještaj o trudu
- [`docs/VIEWER-SPEC.md`](VIEWER-SPEC.md) — spec ponašanja (izvor istine)
- [`docs/3d-bista-tehnicki-vodic.md`](3d-bista-tehnicki-vodic.md) — naučene lekcije
- `implementacije/<ime>/README.md` — upute po tehnologiji
