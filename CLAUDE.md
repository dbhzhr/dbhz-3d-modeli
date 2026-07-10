# CLAUDE.md — dbhz-3d-modeli

Digitalni muzej DBHZ: katalog GLB modela + implementacije 3D viewera u više
tehnologija. **Portira se `docs/VIEWER-SPEC.md`, ne kod** — svaka implementacija
reproducira spec ponašanje vlastitim idiomima.

## Struktura

| Putanja | Sadržaj |
|---|---|
| `docs/VIEWER-SPEC.md` | ⭐ izvor istine za ponašanje viewera |
| `docs/00…05-*.md` | analiza tehnologija + plan po tehnologiji |
| `docs/STATUS.md` | živa tablica statusa implementacija |
| `docs/3d-bista-tehnicki-vodic.md` | naučene lekcije (nagib scana, FitCamera, fullscreen bug) |
| `modeli/tomislav-bista/` | GLB izvor istine (Y-up, centriran, 2 jedinice, bez tekstura) + USDZ derivat |
| `alati/fix_upright.py` | pipeline STL → uspravan GLB |
| `referentna-implementacija/web-react-three/` | 100% radna referenca (Vite + React 18 + three 0.169 + R3F 8 + drei 9) |
| `implementacije/<ime>/` | portovi: web-vanilla, web-model-viewer, expo, flutter, android-sceneview, ios-realitykit |

## Konvencije

- **Sve spec vrijednosti u JEDNOJ konstantnoj strukturi po implementaciji**
  (npr. `SPEC` objekt/struct) — bez raspršenih hardkodiranih hexova.
- UI kopije na hrvatskom; commit poruke na hrvatskom.
- Svaka implementacija ima vlastiti `README.md`: kako pokrenuti + copy-paste
  upute za ubacivanje u postojeću app te tehnologije.
- Atribucijski caveat: model tretirati kao ilustrativnu 3D digitalizaciju
  („potvrditi prije objave") — v. `modeli/tomislav-bista/README.md`. U UI-ju
  viewera prikazati tu napomenu.
- Pinati verzije ovisnosti; zabilježiti ih u `docs/STATUS.md`.
- Nakon svake implementacije: verifikacija → commit → ažuriraj `docs/STATUS.md`
  i tablicu u root `README.md` → push.

## Spec u brojkama (detalji u VIEWER-SPEC.md)

- Rotacija samo oko Y (360°); polar FIKSAN na 8° iznad horizonta (82° od zenita);
  pan isključen; zoom 2.2–9; auto-rotate ~0.9 (puni krug ~66 s) s dampingom.
- Materijali: bronca `#b07d44`/0.78/0.42 (default) · kamen `#e9e4d3`/0.02/0.93 ·
  patina `#5b9b82`/0.28/0.74; prijelaz lerp `k = 1 − e^(−4.5·dt)` (~1 s).
- FitCamera: `rXZ = hypot(dimX,dimZ)/2`; `distW = rXZ*(1.2/hTan+1)`;
  `distV = 1.15*halfH/vTan + 0.35*rXZ`; `dist = max(distV,distW)`; fovY 40°.
- Scena: pozadina `#0c1c13`; ambient 0.55; key light (4,6,5) int 1.6 sa sjenom;
  fill `#ffe6b0` (−5,2,−3) int 0.5; kontaktna sjena y≈−1.05, opacity ~0.5.
- UI: swatchevi gore lijevo (aktivni: bijeli rub + zlatni prsten `#D99E12`),
  fullscreen gumb gore desno.
- Na nativnim platformama ekvivalent: kamera fiksna, rotira se MODEL oko Y.

## Ključni gotchas (naučeno, ne pretpostavljati)

1. **Headless Chrome + SwiftShader je NEPOUZDAN za kadriranje/kameru** —
   pokazivao staru udaljenost kamere iako je kod bio ispravan. Koristiti samo
   kao smoke test (`--headless=new --timeout=N`); **NIKAD `--virtual-time-budget`
   uz autoRotate** (rAF drži virtual time → visi). Mjerodavno: pravi Chrome kroz
   chrome-devtools MCP (`new_page`, `resize_page`, CDP klik = trusted gesture,
   `evaluate_script` za runtime stanje).
2. **Fullscreen overlay UVIJEK na root razini** (portal u `document.body` /
   modalni route / `fullScreenCover`). `position:fixed` unutar app stabla lomi
   se čim predak ima transform/animaciju (containing block!) — model „potone"
   ispod viewporta (viđen iOS bug).
3. **Klon scene za drugu instancu**: isti 3D objekt ne smije biti u dva scene
   grapha (inline + overlay) — kloniraj (`scene.clone(true)` / entity clone);
   geometrija se dijeli, jeftino.
4. **FitCamera tek kad model postoji** (bbox); mijenja SAMO udaljenost, ne smjer
   pogleda. Dvije zamke: projicirana širina rotirajućeg modela doseže XZ
   dijagonalu (ne dims.x), a perspektiva traži fit na najbližoj plohi.
5. Pravilo verifikacije: **MJERI, ne pogađaj** — bbox, kut, udaljenost kamere —
   pa tek onda mijenjaj kod ili commitaj.

## Verifikacija po platformi

- Web / Expo-web / Flutter-web: chrome-devtools MCP — portret 390×844 i
  landscape, klik na fullscreen (trusted), `evaluate_script` provjere.
- Flutter: `flutter run -d chrome`; zatim simulator/emulator/uređaj ako postoji.
- Android: minimalno `./gradlew assembleDebug`; s uređajem `adb exec-out screencap`.
- iOS: minimalno `xcodebuild build` za simulator; `xcrun simctl` boot + screenshot.
