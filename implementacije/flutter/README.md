# flutter — Flutter viewer (`model_viewer_plus`)

Put 1 iz `docs/03-flutter.md`: Googleov `<model-viewer>` u WebView-u kroz
[model_viewer_plus](https://pub.dev/packages/model_viewer_plus). Polar lock,
zoom i auto-rotate su model-viewer atributi; **animirani prijelaz materijala i
swatchevi idu kroz JS injection** (`relatedJs` + `innerModelViewerHtml`).

## Pinane verzije

Flutter 3.41.6 / Dart 3.11.4 · model_viewer_plus 1.10.0 · web ^1.x
(model-viewer.min.js 4.1.1 bundlan u paketu).

## Pokretanje

```bash
cd implementacije/flutter
flutter pub get
flutter run -d chrome        # web
flutter run -d <device-id>   # Android / iOS
flutter build apk --release  # standalone APK
flutter build ios --simulator
```

## Kako je spec pokriven

| Spec | Izvedba |
|---|---|
| Polar lock 8° iznad horizonta | `minCameraOrbit`/`maxCameraOrbit` s istim kutom (82°) — clamp izmjeren |
| Zoom 2.2–9 (samo udaljenost) | radijus u min/max orbit; FOV konstantan pri zoomu (izmjereno) |
| Auto-rotate ~66 s/krug | `rotationPerSecond: '5.45deg'` |
| Animirani prijelaz materijala | `relatedJs`: rAF lerp `k = 1 − e^(−4.5·dt)` nad material API-jem |
| Swatchevi + atribucijska napomena | `innerModelViewerHtml` (unutar WebView-a, uz model) |
| Fullscreen | full-screen ruta na ROOT navigatoru (`fullscreenDialog`), nova ModelViewer instanca |
| AR | `ar: true` + `arModes` — Scene Viewer na Androidu radi s GLB-om |
| Sve spec vrijednosti na jednom mjestu | `Spec` klasa u `lib/main.dart` |

## Tri naučene zamke (bitno za ubacivanje u postojeću app!)

1. **Android release treba dopuštenja**: `model_viewer_plus` servira GLB kroz
   lokalni HTTP server → u `android/app/src/main/AndroidManifest.xml` dodati
   `INTERNET` permission **i** `android:usesCleartextTraffic="true"` (debug
   varijanta to ima automatski, release NE — simptomi: vječni spinner pa
   `ERR_CLEARTEXT_NOT_PERMITTED`).
2. **Flutter web ne izvršava `relatedJs`** (ubacuje se innerHTML-om — skripte
   se ne pokreću) → isti JS se na webu injektira ručno (`js_inject_web.dart`),
   a u `web/index.html` treba dodati
   `<script type="module" src="assets/packages/model_viewer_plus/assets/model-viewer.min.js" defer></script>`.
3. **JS init mora pretraživati shadow DOM** — Flutter web drži `<model-viewer>`
   u platform view-u; `document.querySelector` nije dovoljan (v. `walk()` u
   `Spec.relatedJs`). Interval sweep ujedno inicijalizira i kasniju fullscreen
   instancu.

## Dokumentirana odstupanja

- FOV je ~44.5° umjesto 40° iz spec-a — bundlani model-viewer primjenjuje
  auto-framing bez obzira na `field-of-view` atribut; konstantan je pri zoomu
  pa je ponašanje (zoom = samo udaljenost) po spec-u.
- FitCamera formule i spec osvjetljenje nisu portirani (model-viewer
  auto-frame + neutralni environment) — isto ograničenje kao
  `implementacije/web-model-viewer`.
- Varijanta materijala se ne prenosi između inline i fullscreen instance
  (dvije neovisne WebView instance bez mosta) — fullscreen kreće od `bronca`.

## Ubacivanje u POSTOJEĆU Flutter aplikaciju (copy-paste)

1. `flutter pub add model_viewer_plus web`
2. Kopiraj `lib/main.dart` klase `Spec` i `BistaViewer` (+ `js_inject_*.dart`
   ako ciljaš web) te asset `assets/tomislav-bista.glb` (⚠️ GLB derivat s
   normalama i materijalom — v. `implementacije/web-model-viewer/README.md`).
3. U `pubspec.yaml` registriraj asset; za Android release primijeni zamku #1,
   za web zamku #2.
4. `BistaViewer()` je samostalan widget — ubaci ga u bilo koji ekran.

## Napomena o modelu

Model je ilustrativna 3D digitalizacija — atribucija skulpture nije potvrđena
(v. `modeli/tomislav-bista/README.md`); napomena je prikazana u UI-ju viewera.
