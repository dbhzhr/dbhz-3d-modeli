# web-model-viewer — Google `<model-viewer>` statička stranica

Port `docs/VIEWER-SPEC.md` na [`<model-viewer>`](https://modelviewer.dev/) web
komponentu (pinano `@google/model-viewer@4.0.0` s jsdelivr CDN-a). Najbrži put
do embed stranice pojedinog modela s AR-om.

## Pokretanje

```bash
cd implementacije/web-model-viewer
npx serve .          # ili: python3 -m http.server 8000
```

Deep-link materijala: `?materijal=bronca|kamen|patina`.

## ⚠️ Poseban GLB za ovu implementaciju

`tomislav-bista.glb` OVDJE nije identičan izvoru iz `modeli/` — derivat je s:

1. **glatkim vertex normalama** — izvorni GLB nema `NORMAL` atribut (three.js
   ih računa u runtimeu, `<model-viewer>` ne → bez ovoga sjenčanje je facetirano);
2. **upisanim PBR materijalom** (bronca, linearni baseColorFactor) — material
   API treba postojeći material slot da bi prijelaz radio.

Regeneracija iz izvora: v. povijest ovog committa (trimesh export s
`include_normals=True` + patch materijala u JSON chunku).

## Kako je spec pokriven

| Spec | Izvedba |
|---|---|
| Polar lock 8° iznad horizonta | `min/max-camera-orbit="auto 82deg …"` (isti kut u oba) — clamp potvrđen mjerenjem |
| Zoom 2.2–9 | radijus u `min/max-camera-orbit` (model je 2 jedinice ≙ 2 m) |
| fovY 40°, zoom mijenja samo udaljenost | `field-of-view` + `min/max-field-of-view` svi na 40° |
| Auto-rotate ~66 s/krug | `rotation-per-second="5.45deg"` |
| Pan isključen | `disable-pan` |
| Animirani prijelaz materijala | rAF petlja nad `model.materials[0].pbrMetallicRoughness` (`k = 1 − e^(−4.5·dt)`) |
| Fullscreen | nativni API + overlay fallback na `document.body`; druga `<model-viewer>` instanca (GLB iz keša) |
| AR | `ar ar-modes="webxr scene-viewer quick-look"` — Android Scene Viewer radi s GLB-om; za iOS Quick Look dodati `ios-src` s USDZ-om |

### Dokumentirana ograničenja

- **FitCamera formule iz spec-a nisu portirane** — `<model-viewer>` ima vlastito
  auto-kadriranje (framed distance po bboxu), koje je za ovaj model dovoljno u
  portretu i landscapeu. Kadar nije identičan referentnoj implementaciji.
- **Osvjetljenje iz spec-a (poglavlje 5) nije portirano 1:1** — koristi se
  model-viewerov neutralni environment + `shadow-intensity`. Dojam materijala
  je blizu, ali ne piksel-identičan.
- Na iOS Safariju nativni Fullscreen API ne postoji → koristi se overlay put
  (isti obrazac kao referentna implementacija).

## Ubacivanje u postojeću stranicu / CMS (copy-paste)

Minimalna varijanta (bez prijelaza materijala — samo rotacija + AR):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js"></script>
<model-viewer
  src="/putanja/do/tomislav-bista.glb"
  alt="Bista kralja Tomislava"
  style="width:100%;height:480px;background:#0c1c13"
  camera-controls disable-pan auto-rotate
  rotation-per-second="5.45deg"
  interaction-prompt="none"
  camera-orbit="0deg 82deg 3.6m"
  min-camera-orbit="auto 82deg 2.2m"
  max-camera-orbit="auto 82deg 9m"
  field-of-view="40deg" min-field-of-view="40deg" max-field-of-view="40deg"
  shadow-intensity="0.5" shadow-softness="1"
  ar ar-modes="webxr scene-viewer quick-look"
></model-viewer>
```

Za punu varijantu (swatchevi + animirani prijelaz + fullscreen) kopiraj cijeli
`<script type="module">` blok iz `index.html` — samostalan je (jedna `SPEC`
konstanta, bez ovisnosti).

## Napomena o modelu

Model je ilustrativna 3D digitalizacija — atribucija skulpture nije potvrđena
(v. `modeli/tomislav-bista/README.md`); napomena je prikazana i u UI-ju viewera.
