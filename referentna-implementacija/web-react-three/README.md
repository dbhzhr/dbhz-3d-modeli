# bista-3d — standalone 3D pregled biste kralja Tomislava

Izolirana, reusabilna 3D komponenta (three.js + React Three Fiber) izvučena iz
DBHZ novčanik prototipa. Bista se rotira **samo oko vertikalne osi** (360°
lijevo-desno); pogled je fiksiran u razini stola i ne može se okrenuti naglavačke.

## Pokretanje

```bash
npm install
npm run dev        # http://localhost:5173
npm run build && npm run preview   # produkcijski build
```

## Kako je rotacija zaključana (programski, bez ručnog fiksiranja)

Dva neovisna mehanizma u `src/BistaViewer.tsx`:

1. **Uspravnost modela** — geometrijska, ne vizualna: originalni 3D scan bio je
   **nagnut 42.8°**. `scripts/fix_upright.py` (trimesh) nalazi najveću koplanarnu
   plohu na rubu modela (ravno dno postolja) i rotira model tako da njena normala
   gleda točno u −Y. Nikakva vizualna detekcija (Claude Vision) nije potrebna —
   dno postolja je jednoznačan geometrijski marker uspravnog položaja.
2. **Zaključana kamera** — `OrbitControls` s `minPolarAngle === maxPolarAngle`:
   vertikalni kut kamere je konstanta (prop `elevationDeg`, default 8° iznad
   horizonta), pa je jedina preostala sloboda azimut (rotacija lijevo-desno).
   `enablePan={false}`, zoom ograničen (`minDistance`/`maxDistance`).

## Reuse u drugoj aplikaciji

Kopiraj `src/BistaViewer.tsx` + `public/models/tomislav-bista.glb`. Ovisnosti:
`three@^0.169`, `@react-three/fiber@^8` i `@react-three/drei@^9` (React 18).

```tsx
<BistaViewer
  modelUrl="/models/tomislav-bista.glb"
  elevationDeg={8}      // fiksni kut pogleda iznad horizonta
  autoRotate            // automatska rotacija oko vertikale
  initialDistance={4.8} // početni zoom
/>
```

Za povratak u DBHZ novčanik: zamijeni `public/models/tomislav-bista.glb`
ispravljenim modelom i dodaj `minPolarAngle`/`maxPolarAngle` na OrbitControls
u `src/screens/BistaViewer.tsx`.

## Detaljna tehnička dokumentacija

Potpuni vodič s mermaid dijagramima (pipeline ispravljanja nagiba scana, FitCamera
geometrija kadriranja, fullscreen portal bug na iOS-u, animirani materijali,
verifikacijske lekcije) živi u wallet repou:
[`dbhz-novcanik-prototip/docs/3d-bista-tehnicki-vodic.md`](https://github.com/stepanic/dbhz-novcanik-prototip/blob/main/docs/3d-bista-tehnicki-vodic.md).

## Regeneriranje modela

```bash
python3 scripts/fix_upright.py   # čita ~/Downloads/Kralj Tomislav - Bista final_300k.stl
```

Pipeline: decimacija 300k→80k trokuta → detekcija dna (klaster normala od 2° +
subklasteriranje po offsetu ravnine + provjera koplanarnosti i ruba) → rotacija
na −Y → centriranje → normalizacija na 2 jedinice → GLB export.
