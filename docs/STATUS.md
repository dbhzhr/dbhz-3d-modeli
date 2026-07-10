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
| `implementacije/expo` | ⬜ nije počelo | — | — | — | — |
| `implementacije/flutter` | ⬜ nije počelo | — | — | — | — |
| `implementacije/android-sceneview` | ⬜ nije počelo | — | — | — | — |
| `implementacije/ios-realitykit` | ⬜ nije počelo | — | — | — | — |

Legenda statusa: ⬜ nije počelo · 🔨 u izradi · 🧪 čeka verifikaciju ·
✅ verificirano · 📱 needs device testing · ⛔ blocked: <razlog>
