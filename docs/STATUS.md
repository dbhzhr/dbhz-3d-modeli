# STATUS implementacija

*Živi dokument — ažurira se nakon svake implementacije. Zadnje ažuriranje: 2026-07-10.*

## Toolchainovi na razvojnom stroju (inventura 2026-07-10)

| Alat | Verzija / stanje | Može se testirati lokalno? |
|---|---|---|
| Node.js / npm | v24.16.0 / 11.13.0 | ✅ web buildovi |
| Chrome + chrome-devtools MCP | Chrome 149 | ✅ mjerodavna web verifikacija |
| Xcode | 26.3 (Build 17C529) | ✅ iOS build |
| iOS simulatori | iOS 18.1 + iOS 26.3 (iPhone 17 Pro…) | ✅ boot + screenshot |
| CocoaPods | 1.16.2 | ✅ |
| Flutter (fvm) | 3.41.6 stable / Dart 3.11.4 | ✅ uklj. web |
| Java | OpenJDK 21.0.10 | ✅ |
| Android SDK | platforms 28–36.1, build-tools do 36.1.0, NDK, emulator | ✅ |
| Android emulatori | Medium_Phone_API_35, Small_Phone_API_35, EON_TV_API31 | ✅ |
| Fizički uređaji | moto g86 5G (Android 16, adb) · iPhone 15 Pro (wireless, iOS 26.5) | ✅ Android preko adb; iOS wireless (nestabilnije) |
| `usdzconvert` / Reality Converter | ❌ nema | USDZ derivat generirati alternativno (usd-core / Python) |
| Python 3 + trimesh | 3.13 + trimesh ✅ | ✅ pipeline modela |

## Implementacije

| Implementacija | Status | Pinane verzije | Kako pokrenuti | Kako testirano | Poznata ograničenja |
|---|---|---|---|---|---|
| `referentna-implementacija/web-react-three` | ✅ radna referenca | three 0.169, R3F 8, drei 9, React 18, Vite 5 | `npm install && npm run dev` | u produkciji (dbhz-prototip) | — |
| `implementacije/web-vanilla` | ✅ verificirano | three 0.169.0 (import map, jsdelivr) | `npx serve .` ili `python3 -m http.server` pa otvori `index.html` | pravi Chrome (devtools MCP): portret 390×844 + landscape 844×390 (screenshotovi, FitCamera dist 5.57/3.48), polar 82° runtime, prijelaz materijala mjeren (eksp. rampa metalness 0.02→0.78), nativni fullscreen (trusted CDP klik) + overlay fallback (obrisan `requestFullscreen`) + Escape izlaz, klon scene potvrđen | zahtijeva HTTP server (ES moduli); CDN import map (offline treba vendorirati three) |
| `implementacije/web-model-viewer` | ✅ verificirano | @google/model-viewer 4.0.0 (jsdelivr) | `npx serve .` ili `python3 -m http.server` | pravi Chrome (devtools MCP): portret + landscape screenshotovi, polar clamp mjeren (forsiran 20° → vratio se na 82°), zoom clamp (1 m → 2.2 m), animirani prijelaz mjeren (metalness 0.78→0.02 eksp.), nativni fullscreen + overlay fallback + Escape | FitCamera formule i spec osvjetljenje nisu portirani (model-viewer auto-frame + neutralni environment — dokumentirano u README); poseban GLB derivat (normale + materijal); iOS Quick Look traži USDZ (`ios-src`) |
| `implementacije/expo` | ✅ verificirano (web + fizički Android) | Expo SDK ~57, RN 0.86, React 19.2, react-native-webview 13.16.1, three 0.169.0 (build-time), esbuild 0.24 | `npm install && npm run build:viewer && npm run web`; native: `npx expo run:android` / `run:ios` | web: pravi Chrome (viewer u iframeu, polar 82°, FitCamera dist mjeren, postMessage most RN→viewer klikom); Android: debug APK instaliran na fizičku Motorolu Edge 30 Ultra — screenshot potvrdio render biste u WebView-u (offline HTML bundle) i promjenu materijala tapom na swatch; iOS: `expo run:ios` Build Succeeded, instaliran i pokrenut na iPhone 17 Pro simulatoru (iOS 26.3) — screenshot potvrdio render i promjenu materijala | WebGL u WebView-u (katalog OK, ne 60fps gaming); `viewerHtml.ts` 2.4 MB u JS bundlu (offline trade-off); produkcijska nadogradnja: react-native-filament (docs/02 Put 3) |
| `implementacije/flutter` | ✅ verificirano (web + fizički Android + iOS simulator) | Flutter 3.41.6, model_viewer_plus 1.10.0 (model-viewer 4.1.1) | `flutter pub get && flutter run -d chrome` / `flutter build apk --release` | web build kroz pravi Chrome: polar clamp (forsiran 15°→82°), zoom clamp, FOV konstantan pri zoomu, animirani prijelaz mjeren (0.78→0.02 eksp.), fullscreen ruta (2. instanca preko cijelog viewporta) + povratak; Android: release APK na Motoroli Edge 30 Ultra (screenshotovi: render, prijelaz kamen→bronca, fullscreen ruta, AR gumb); iOS: iPhone 17 Pro simulator screenshot | tri zamke dokumentirane u README (INTERNET+cleartext za release, relatedJs ne radi na webu bez ručne injekcije, shadow-DOM sweep); FOV ~44.5° umjesto 40°; varijanta se ne prenosi u fullscreen instancu |
| `implementacije/android-sceneview` | ✅ verificirano (fizički Android) | SceneView 4.21.2, Kotlin 2.4.0, AGP 8.10.1, Gradle 8.14.2, compose-bom 2024.12 | `./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk` | `assembleDebug` prolazi; na Motoroli Edge 30 Ultra: render + kadar (screenshot), animirani prijelaz bronca↔kamen (mid/end frame), auto-rotacija (azimut napreduje između snimki), horizontalni drag rotira / vertikalni NE mijenja polar (swipe testovi), fullscreen Dialog s novom SceneView instancom + safe-area + izlaz + prijenos varijante | osvjetljenje je SceneView default (ne spec 1:1); nema kontaktne sjene; AR nije uključen; Kotlin MORA biti 2.4.0 (SceneView metadata) |
| `implementacije/ios-realitykit` | ✅ verificirano (iOS simulator) · 📱 geste čekaju uređaj | iOS 18+, RealityKit RealityView, XcodeGen (projekt iz project.yml), USDZ derivat (alati/glb2usdz.py) | `xcodegen generate && xcodebuild … build`; simulator: `simctl install/launch` | BUILD SUCCEEDED (Xcode 26.3); iPhone 17 Pro simulator: portret + landscape screenshotovi (rotacija → refit + eksplicitna svjetla), deep-link `dbhz3d://materijal/kamen` mijenja materijal, auto-rotacija, `fullScreenCover` preko svega + izlaz + prijenos varijante | drag/pinch geste i AR Quick Look needs device testing (simctl ne sintetizira dodire); 2 istovremene RealityView scene nepouzdane na simulatoru (inline se gasi u fullscreenu); default IBL zna nestati na rotaciju → eksplicitna svjetla |

Legenda statusa: ⬜ nije počelo · 🔨 u izradi · 🧪 čeka verifikaciju ·
✅ verificirano · 📱 needs device testing · ⛔ blocked: <razlog>
