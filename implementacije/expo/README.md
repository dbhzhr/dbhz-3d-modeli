# expo — Expo / React Native viewer (WebView reuse)

Put 1 iz `docs/02-expo-react-native.md`: **provjereni web viewer**
(`implementacije/web-vanilla`) bundlan **offline** kao samodostatan HTML string
(three.js + GLB kao data URI) i prikazan u `react-native-webview`; na webu ista
stranica u `<iframe srcDoc>`. 100% reuse ponašanja iz VIEWER-SPEC-a — polar
lock, FitCamera, animirani materijali i fullscreen-overlay žive u web vieweru.

## Pinane verzije

Expo SDK ~57, React Native 0.86, React 19.2, react-native-webview 13.16.1,
three 0.169.0 (samo build-time, u bundlu viewera), esbuild 0.24.

## Pokretanje

```bash
cd implementacije/expo
npm install
npm run build:viewer     # regenerira src/viewerHtml.ts iz ../web-vanilla + GLB
npm run web              # web (Metro na http://localhost:8081)
npx expo run:android     # Android (uređaj/emulator; debug build + Metro)
npx expo run:ios         # iOS simulator
```

`src/viewerHtml.ts` je generiran (2.4 MB) i committan — `npm run build:viewer`
treba ponoviti samo kad se promijeni `web-vanilla` viewer ili GLB.

## Arhitektura

```
scripts/build-viewer.mjs   esbuild: web-vanilla/bista-viewer.js + three -> IIFE
                           + GLB base64 -> JEDAN HTML -> src/viewerHtml.ts
App.tsx                    Platform.OS === 'web' ? <iframe srcDoc> : <WebView source={{html}}>
                           + postMessage most (RN gumbi mijenjaju materijal)
```

- **Offline**: sve je u HTML stringu — WebView ne radi nijedan mrežni zahtjev.
- **postMessage most**: RN → viewer `{"type":"setVariant","variant":"kamen"}`;
  po istom obrascu dodaju se nove poruke (viewer sluša u `viewer-entry.js`).
- **Monorepo-friendly**: viewer je build artefakt vanjskog paketa; kasniji
  `react-native-filament` put (docs/02, Put 3) može živjeti uz ovaj ekran, isti
  katalog i spec.

## Ubacivanje u POSTOJEĆU Expo/RN aplikaciju (copy-paste)

1. `npx expo install react-native-webview`
2. Kopiraj `scripts/build-viewer.mjs`, `scripts/viewer-entry.js` i generirani
   `src/viewerHtml.ts` (ili pokreni build skriptu uz `three` + `esbuild` u
   devDependencies; prilagodi putanje do `web-vanilla` i GLB-a).
3. Ekran:

```tsx
import { WebView } from 'react-native-webview';
import { viewerHtml } from './src/viewerHtml';

export function Bista3DScreen() {
  return <WebView originWhitelist={['*']} source={{ html: viewerHtml }} style={{ flex: 1 }} />;
}
```

Na webu (Expo web / react-native-web) umjesto WebView-a koristi
`<iframe srcDoc={viewerHtml} />` — v. `App.tsx`.

## Ograničenja

- WebGL u WebView-u: pristojne, ne vrhunske performanse (za katalog dovoljno);
  produkcijska nadogradnja je react-native-filament (docs/02, Put 3).
- Fullscreen unutar WebView-a koristi overlay put viewera (WebView nema
  Fullscreen API) — prekriva WebView, koji je ionako preko cijelog ekrana app-a.
- `viewerHtml.ts` od 2.4 MB ulazi u JS bundle — svjesna odluka radi offline
  jednostavnosti; alternativa je expo-asset s GLB-om posebno.

## Napomena o modelu

Model je ilustrativna 3D digitalizacija — atribucija skulpture nije potvrđena
(v. `modeli/tomislav-bista/README.md`); napomena je prikazana u UI-ju viewera.
