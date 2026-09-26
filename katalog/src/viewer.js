// viewer.js — 3D muzejski viewer za katalog (vanilla three.js, bez Reacta).
//
// Poopćeni implementacije/web-vanilla/bista-viewer.js: isto ponašanje po
// docs/VIEWER-SPEC.md (polar lock, FitCamera, animirani prijelaz materijala,
// fullscreen s portal-fallbackom na razini <body>), ali parametriziran modelom
// iz kataloga (spec pogl. 7): popis materijala i napomena dolaze iz unosa u
// modeli/katalog.json. Model bez `materijali` zadržava vlastite materijale.
//
// const viewer = createModelViewer(el, { modelUrl, materijali: ['bronca', 'kamen'], napomena });
// viewer.dispose(); // pri prelasku na drugi model

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Sve spec vrijednosti na jednom mjestu (VIEWER-SPEC.md) — ne raspršivati.
export const SPEC = {
  background: '#0c1c13',
  fovY: 40,
  elevationDeg: 8, // polarni kut pogleda: 8° iznad horizonta, FIKSAN
  zoom: { min: 2.2, max: 9 },
  autoRotateSpeed: 0.9, // puni krug ~66 s
  initialDistance: 3.6,
  materialLerpRate: 4.5, // k = 1 − e^(−4.5·dt), prijelaz ~1 s
  variants: {
    bronca: { color: '#b07d44', metalness: 0.78, roughness: 0.42, label: 'Bronca' },
    kamen: { color: '#e9e4d3', metalness: 0.02, roughness: 0.93, label: 'Brački kamen' },
    patina: { color: '#5b9b82', metalness: 0.28, roughness: 0.74, label: 'Bronca s patinom' },
  },
  defaultVariant: 'bronca',
  ui: {
    activeRing: '#D99E12',
    buttonBg: 'rgba(6,39,22,0.55)',
  },
  lights: {
    ambient: 0.55,
    key: { position: [4, 6, 5], intensity: 1.6 },
    fill: { position: [-5, 2, -3], intensity: 0.5, color: '#ffe6b0' },
  },
  contactShadow: { y: -1.05, opacity: 0.5 },
  fit: {
    // FitCamera formule iz spec-a (poglavlje 3)
    widthMargin: 1.2,
    heightMargin: 1.15,
    depthComp: 0.35,
  },
};

// ---------------------------------------------------------------------------
// Keš učitanih GLB scena po URL-u; svaka instanca viewera dobiva KLON
// (isti Object3D ne smije biti u dva scene grapha — inline + fullscreen overlay).
const gltfCache = new Map();
function loadModel(url) {
  if (!gltfCache.has(url)) {
    gltfCache.set(
      url,
      new GLTFLoader().loadAsync(url).then((gltf) => gltf.scene),
    );
  }
  return gltfCache.get(url).then((scene) => scene.clone(true));
}

function variantFromUrl(allowed) {
  const v = new URLSearchParams(window.location.search).get('materijal');
  return v && allowed.includes(v) ? v : null;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function fullscreenIcon(expand) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', '#fff');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    expand ? 'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5' : 'M8 3v5H3M21 8h-5V3M16 21v-5h5M3 16h5v5',
  );
  svg.appendChild(path);
  return svg;
}

// ---------------------------------------------------------------------------
// Jedna instanca scene (canvas + kontrole). Interna — javni API je createModelViewer.
function createInstance(rootEl, opts) {
  const { modelUrl, variants, napomena, getVariant, setVariant, onFullscreenToggle, isFullscreen, onError } = opts;
  const hasVariants = variants.length > 0;

  // Ne gaziti postojeći position (fullscreen overlay je fixed!) — samo osiguraj
  // da apsolutno pozicionirane kontrole imaju containing block.
  if (getComputedStyle(rootEl).position === 'static') rootEl.style.position = 'relative';
  rootEl.style.background = SPEC.background;
  rootEl.style.overflow = 'hidden';

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  rootEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SPEC.background);

  const camera = new THREE.PerspectiveCamera(SPEC.fovY, 1, 0.1, 100);
  const polar = THREE.MathUtils.degToRad(90 - SPEC.elevationDeg);
  // Početna pozicija točno na fiksnom polarnom kutu (8° iznad horizonta).
  camera.position.setFromSphericalCoords(SPEC.initialDistance, polar, 0);

  // Svjetla po spec-u
  scene.add(new THREE.AmbientLight(0xffffff, SPEC.lights.ambient));
  const key = new THREE.DirectionalLight(0xffffff, SPEC.lights.key.intensity);
  key.position.set(...SPEC.lights.key.position);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -2.5;
  key.shadow.camera.right = key.shadow.camera.top = 2.5;
  key.shadow.radius = 6;
  scene.add(key);
  const fill = new THREE.DirectionalLight(new THREE.Color(SPEC.lights.fill.color), SPEC.lights.fill.intensity);
  fill.position.set(...SPEC.lights.fill.position);
  scene.add(fill);

  // Meka kontaktna sjena: ShadowMaterial ploha ispod modela
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.ShadowMaterial({ opacity: SPEC.contactShadow.opacity }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = SPEC.contactShadow.y;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minPolarAngle = polar; // polar lock: min === max → jedina sloboda je azimut
  controls.maxPolarAngle = polar;
  controls.minDistance = SPEC.zoom.min;
  controls.maxDistance = SPEC.zoom.max;
  controls.autoRotate = true;
  controls.autoRotateSpeed = SPEC.autoRotateSpeed;
  controls.enableDamping = true;

  // Materijal — jedan MeshStandardMaterial za cijeli model; prijelaz varijanti
  // se animira lerpom sva tri parametra u render petlji. Bez varijanti model
  // zadržava materijale iz GLB-a.
  const startVariant = hasVariants ? SPEC.variants[getVariant()] : null;
  const material = hasVariants
    ? new THREE.MeshStandardMaterial({
        color: new THREE.Color(startVariant.color),
        metalness: startVariant.metalness,
        roughness: startVariant.roughness,
      })
    : null;

  let subject = null; // grupa s modelom — bbox za FitCamera
  loadModel(modelUrl).then((model) => {
    if (disposed) return;
    model.traverse((o) => {
      if (o.isMesh) {
        if (material) o.material = material;
        o.castShadow = true;
        if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      }
    });
    // Centriranje (model je već centriran u pipelineu, ali bbox-centriranje je jeftino osiguranje)
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const group = new THREE.Group();
    group.add(model);
    scene.add(group);
    subject = group;
    fitCamera(); // kadriraj tek kad bbox postoji
    rootEl.dataset.stanje = 'ucitano';
  }, (err) => {
    if (!disposed) onError?.(err);
  });
  rootEl.dataset.stanje = 'ucitavanje';

  // FitCamera (spec poglavlje 3): na svaku promjenu veličine viewporta postavi
  // udaljenost da CIJELI model stane po visini i širini. Mijenja samo udaljenost.
  function fitCamera() {
    if (!subject) return;
    const box = new THREE.Box3().setFromObject(subject);
    if (box.isEmpty()) return;
    const dims = box.getSize(new THREE.Vector3());
    const halfH = dims.y / 2;
    const rXZ = Math.hypot(dims.x, dims.z) / 2; // horizontalni cirkumradius — invarijantan na azimut
    const vTan = Math.tan(THREE.MathUtils.degToRad(SPEC.fovY) / 2);
    const { clientWidth: w, clientHeight: h } = rootEl;
    if (!w || !h) return;
    const hTan = vTan * (w / h);
    const distW = rXZ * (SPEC.fit.widthMargin / hTan + 1); // fit širine na najbližoj plohi
    const distV = (SPEC.fit.heightMargin * halfH) / vTan + SPEC.fit.depthComp * rXZ;
    camera.position.setLength(Math.max(distV, distW)); // čuva azimut i polarni kut
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = rootEl;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitCamera();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(rootEl);
  resize();

  // Render petlja: damping kontrola + animirani prijelaz materijala
  const clock = new THREE.Clock();
  const targetColor = new THREE.Color();
  let disposed = false;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (material) {
      const t = SPEC.variants[getVariant()];
      const k = 1 - Math.exp(-SPEC.materialLerpRate * dt); // eksp. prigušenje, frame-rate neovisno
      targetColor.set(t.color);
      material.color.lerp(targetColor, k);
      material.metalness += (t.metalness - material.metalness) * k;
      material.roughness += (t.roughness - material.roughness) * k;
    }
    controls.update();
    renderer.render(scene, camera);
  });

  // --- UI (hrvatski) ---------------------------------------------------------
  const swatchWrap = document.createElement('div');
  Object.assign(swatchWrap.style, { position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '8px' });
  const swatches = {};
  for (const v of variants) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = SPEC.variants[v].label;
    btn.setAttribute('aria-label', SPEC.variants[v].label);
    Object.assign(btn.style, {
      width: '26px',
      height: '26px',
      borderRadius: '50%',
      background: SPEC.variants[v].color,
      cursor: 'pointer',
      padding: '0',
    });
    btn.addEventListener('click', () => setVariant(v));
    swatchWrap.appendChild(btn);
    swatches[v] = btn;
  }
  if (hasVariants) rootEl.appendChild(swatchWrap);

  function syncSwatches() {
    const active = getVariant();
    for (const v of variants) {
      const on = v === active;
      swatches[v].style.border = on ? '2px solid #fff' : '2px solid rgba(255,255,255,0.35)';
      swatches[v].style.boxShadow = on ? `0 0 0 2px ${SPEC.ui.activeRing}` : '0 1px 4px rgba(0,0,0,0.4)';
      swatches[v].setAttribute('aria-pressed', String(on));
    }
  }
  syncSwatches();

  const fsBtn = document.createElement('button');
  fsBtn.type = 'button';
  const fsLabel = isFullscreen ? 'Izađi iz punog zaslona' : 'Puni zaslon';
  fsBtn.title = fsLabel;
  fsBtn.setAttribute('aria-label', fsLabel);
  Object.assign(fsBtn.style, {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '30px',
    height: '30px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.25)',
    background: SPEC.ui.buttonBg,
    cursor: 'pointer',
    padding: '0',
  });
  fsBtn.appendChild(fullscreenIcon(!isFullscreen));
  fsBtn.addEventListener('click', onFullscreenToggle);
  rootEl.appendChild(fsBtn);

  // Napomena modela (npr. nepotvrđena atribucija) — vidljiva i u fullscreenu
  const caveat = document.createElement('div');
  caveat.textContent = napomena ?? '';
  Object.assign(caveat.style, {
    position: 'absolute',
    bottom: '8px',
    left: '10px',
    right: '10px',
    color: 'rgba(255,255,255,0.45)',
    font: '11px/1.3 system-ui, sans-serif',
    pointerEvents: 'none',
  });
  if (napomena) rootEl.appendChild(caveat);

  return {
    syncSwatches,
    // Debug uvid za verifikaciju (chrome-devtools MCP evaluate_script)
    debug: { camera, controls, material, renderer, get subject() { return subject; } },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // pri listanju N modela ne gomilati WebGL kontekste
      material?.dispose();
      rootEl.replaceChildren();
    },
  };
}

// ---------------------------------------------------------------------------
/**
 * Javni API. Stvori viewer u zadanom kontejneru.
 * @param {HTMLElement} container — element s definiranom visinom
 * @param {{
 *   modelUrl: string,
 *   materijali?: Array<'bronca'|'kamen'|'patina'>, // prazno/izostavljeno = materijali iz GLB-a
 *   napomena?: string,                             // tekst uz donji rub scene
 *   onVariantChange?: (v: string) => void,
 *   onError?: (err: unknown) => void,
 * }} options
 */
export function createModelViewer(container, options) {
  const { modelUrl, napomena, onVariantChange, onError } = options;
  const variants = (options.materijali ?? []).filter((v) => v in SPEC.variants);
  const defaultVariant = variants.includes(SPEC.defaultVariant) ? SPEC.defaultVariant : variants[0];
  let variant = variantFromUrl(variants) ?? defaultVariant;
  let fsMode = 'inline'; // inline | native | overlay
  let overlayEl = null;
  let overlayInstance = null;
  let prevBodyOverflow = '';

  const instances = new Set();
  const getVariant = () => variant;
  const setVariant = (v) => {
    if (!variants.includes(v) || v === variant) return;
    variant = v;
    for (const i of instances) i.syncSwatches();
    onVariantChange?.(v);
  };
  const shared = { modelUrl, variants, napomena, getVariant, setVariant, onError };

  function openOverlay() {
    // Portal na razinu <body>: fixed unutar app stabla lomi se čim predak ima
    // transform/animaciju (containing block bug) — zato UVIJEK document.body.
    overlayEl = document.createElement('div');
    Object.assign(overlayEl.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
      background: SPEC.background,
    });
    document.body.appendChild(overlayEl);
    prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // scroll lock pozadine
    overlayInstance = createInstance(overlayEl, {
      ...shared,
      isFullscreen: true,
      onFullscreenToggle: closeOverlay,
    });
    instances.add(overlayInstance);
    fsMode = 'overlay';
  }

  function closeOverlay() {
    if (!overlayInstance) return;
    instances.delete(overlayInstance);
    overlayInstance.dispose();
    overlayInstance = null;
    overlayEl.remove();
    overlayEl = null;
    document.body.style.overflow = prevBodyOverflow;
    fsMode = 'inline';
  }

  async function toggleFullscreen() {
    if (fsMode === 'inline') {
      if (container.requestFullscreen) {
        try {
          await container.requestFullscreen();
          fsMode = 'native';
          return;
        } catch {
          /* padamo na overlay */
        }
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
        fsMode = 'native';
        return;
      }
      openOverlay();
    } else if (fsMode === 'native') {
      (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
      fsMode = 'inline';
    } else {
      closeOverlay();
    }
  }

  const onFsChange = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && fsMode === 'native') {
      fsMode = 'inline';
    }
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && fsMode === 'overlay') closeOverlay();
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('keydown', onKey);

  const inline = createInstance(container, {
    ...shared,
    isFullscreen: false,
    onFullscreenToggle: toggleFullscreen,
  });
  instances.add(inline);

  const api = {
    setVariant,
    getVariant,
    toggleFullscreen,
    get fsMode() {
      return fsMode;
    },
    // Debug za mjernu verifikaciju — NE koristiti u produkciji
    get _debug() {
      return { inline: inline.debug, overlay: overlayInstance?.debug ?? null };
    },
    dispose() {
      closeOverlay();
      if (fsMode === 'native') (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
      inline.dispose();
      instances.clear();
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('keydown', onKey);
    },
  };
  window.__dbhzViewer = api; // trenutni viewer, za evaluate_script verifikaciju
  return api;
}
