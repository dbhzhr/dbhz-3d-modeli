# Plan: Expo / React Native (web + iOS + Android iz jedne codebase)

*Stanje 2026-07: tri realna puta, poredana po trudu.*

## Put 1 — WebView reuse (start odmah, ~pola dana)

Ugradi **postojeći, provjereni web viewer** u `react-native-webview`
(na webu ista stranica direktno, bez WebViewa).

```
apps/muzej/
  assets/viewer/   <- build web viewera (vite build) + GLB, bundlan offline
  src/ModelViewerScreen.tsx  <- WebView(source: lokalni index.html?materijal=...)
```

- ✅ 100% reuse koda i ponašanja (sve iz VIEWER-SPEC već radi)
- ✅ radi na iOS/Android/web identično; offline (asseti u bundleu)
- 🟡 WebGL u WebViewu = pristojne, ne vrhunske performanse (za katalog dovoljno)
- Komunikacija RN ⇄ viewer: `postMessage` (npr. RN gumbi mijenjaju materijal)

## Put 2 — expo-gl + React Three Fiber native (dijeli React kod)

`@react-three/fiber/native` + `expo-gl` + `useGLTF` (drei/native).

- ✅ isti R3F mentalni model kao referentna implementacija; komponenta se
  velikim dijelom dijeli između weba i nativea
- ⚠️ **poznati problemi 2026:** Expo SDK 53 nosi `expo-gl@15`, a R3F lanac
  očekuje stariji API (`expo-gl@11` era) → lomovi na stvarnim uređajima;
  na iOS-u expo-gl koristi **deprecated OpenGL ES** framework
- 🟡 asseti kroz Metro (GLB treba `metro.config.js` asset ext) — poznata trvenja
- Preporuka: koristiti samo ako projekt VEĆ ima R3F native iskustvo i
  zaključane verzije koje rade

## Put 3 — react-native-filament (produkcijski native render)

[margelo/react-native-filament](https://github.com/margelo/react-native-filament):
Filament engine (isti kao Android SceneView), **Metal na iOS-u**, render izvan
JS threada, battle-tested u velikim app-ovima.

Plan implementacije viewera po spec-u:
1. `<FilamentView>` + `useModel(require('tomislav-bista.glb'))`.
2. Kamera fiksna na 8° elevacije; **rotiraj model** oko Y (gesture handler →
   kutna brzina + damping; auto-rotate kao `useFrame` ekvivalent).
3. Materijal: Filament `MaterialInstance` — postavi
   `baseColorFactor/metallicFactor/roughnessFactor` po varijanti; lerp u
   render callbacku (`k = 1 − e^(−4.5·dt)`).
4. FitCamera: bbox iz asseta → formula iz spec-a → `camera.lookAt` udaljenost.
5. Fullscreen: RN modal/route preko cijelog ekrana (nema DOM containing-block
   problema, ali isto pravilo: overlay na root razini navigacije).
- ➖ ne radi na webu → web ostaje na referentnoj R3F implementaciji (monorepo:
  `packages/viewer-web` + `packages/viewer-native`, zajednički spec i katalog JSON)

## Preporuka

Kreni s **Putem 1** (odmah radi svugdje), drži **Put 3** kao produkcijsku
nadogradnju kad zatreba 60 fps native osjećaj. Put 2 samo uz zaključane verzije.

Izvori: [react-native-filament](https://github.com/margelo/react-native-filament) ·
[stanje R3F+Expo (verzijski sukobi)](https://trifonstatkov.medium.com/the-current-state-of-using-react-three-fiber-in-react-native-expo-c65918593eaf)
