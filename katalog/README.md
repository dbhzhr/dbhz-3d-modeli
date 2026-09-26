# katalog — javni katalog 3D modela DBHZ

**Uživo:** [dbhz-3d-modeli.domovina.ai](https://dbhz-3d-modeli.domovina.ai) · deep link
`?id=<model>&materijal=bronca|kamen|patina`

Katalog modela 1..N: lijevo popis, u sredini viewer, desno podaci o modelu
(atribucija, materijal prikaza, opis, podaci, preuzimanje GLB-a, AR Quick Look
na iOS-u). Viewer je `implementacije/web-vanilla` poopćen na N modela
(`src/viewer.js`), ponašanje po `docs/VIEWER-SPEC.md`.

| | |
|---|---|
| Build | Vite 8.3.1 + vanilla JS, three 0.169.0 (pinano) |
| Hosting | Cloudflare Worker `dbhz-3d-modeli`, samo static assets (bez Worker skripte), account D.O.M. |
| Domena | custom domain `dbhz-3d-modeli.domovina.ai` (u `wrangler.jsonc`) |
| Podaci | `../modeli/katalog.json` + `../modeli/<id>/` — kopira ih `scripts/sync-modeli.mjs` u `public/modeli/` (ne commita se) |

## Pokretanje

```bash
npm install
npm run dev       # Vite dev server
npm run preview   # produkcijski build kroz wrangler dev (kao na Cloudflareu)
npm run deploy    # build + wrangler deploy
```

## Dodavanje novog modela

1. Pripremi GLB po ugovoru iz `docs/VIEWER-SPEC.md` pogl. 1 (Y-up, centriran,
   najveća dimenzija 2.0) — pipeline v. root `README.md`.
2. Stavi datoteke u `modeli/<id>/` (GLB obavezan, USDZ za AR na iOS-u).
3. Dodaj unos u `modeli/katalog.json`:

```jsonc
{
  "id": "<id>",                         // = ime foldera, ide u ?id=
  "naziv": "…",
  "sazetak": "…",                       // jedna rečenica, prikazuje se i u popisu
  "opis": "…",
  "datoteke": { "glb": "<id>.glb", "usdz": "<id>.usdz" },
  "materijali": ["bronca", "kamen", "patina"],  // izostavi → materijali iz GLB-a
  "atribucija": { "potvrdjeno": false, "tekst": "…" },
  "podaci": [["Izvor", "…"], ["Licenca", "…"]],
  "povezano": { "naziv": "…", "url": "https://…" }   // opcionalno
}
```

4. `npm run deploy`. Build pada ako datoteka iz unosa ne postoji ili je `id` dupli.

Nepotvrđena atribucija (`potvrdjeno: false`) prikazuje napomenu i u popisu,
i u panelu, i uz donji rub scene (uključujući fullscreen).

## Verifikacija (2026-09-26, pravi Chrome kroz chrome-devtools MCP)

- desktop 1440×900: polar 82°, FitCamera udaljenost 3.999 = formula iz spec-a
- portret 390×844: ladica s popisom (zatvorena je `inert`), fullscreen:
  nativni na kontejneru + refit; overlay fallback bez Fullscreen API-ja
  (portal u `body`, klon scene, scroll lock, Escape)
- landscape 844×390: model u kadru (NDC y −0.83…0.85), bez horizontalnog scrolla
- materijal: klik u panelu → swatch i URL `materijal=kamen` sinkronizirani;
  deep link `?materijal=kamen` radi; prijelaz mjeren (metalness 0.39→0.78, eksp.)
- AR Quick Look i dodirne geste čekaju fizički iPhone
