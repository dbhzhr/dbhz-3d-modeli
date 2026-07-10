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
| `implementacije/web-vanilla` | ⬜ nije počelo | — | — | — | — |
| `implementacije/web-model-viewer` | ⬜ nije počelo | — | — | — | — |
| `implementacije/expo` | ⬜ nije počelo | — | — | — | — |
| `implementacije/flutter` | ⬜ nije počelo | — | — | — | — |
| `implementacije/android-sceneview` | ⬜ nije počelo | — | — | — | — |
| `implementacije/ios-realitykit` | ⬜ nije počelo | — | — | — | — |

Legenda statusa: ⬜ nije počelo · 🔨 u izradi · 🧪 čeka verifikaciju ·
✅ verificirano · 📱 needs device testing · ⛔ blocked: <razlog>
