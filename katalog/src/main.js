// Katalog 3D modela DBHZ: popis modela (1..N) + viewer + podaci o modelu.
// Podaci: /modeli/katalog.json (kopija ../modeli/katalog.json, v. scripts/sync-modeli.mjs).
// Adresa: ?id=<model>&materijal=<varijanta> — svaki model ima vlastitu poveznicu.

import { createModelViewer, SPEC } from './viewer.js';

const el = {
  stavke: document.querySelector('#popis-stavke'),
  popis: document.querySelector('#popis'),
  gumbPopis: document.querySelector('.gumb-popis'),
  zastor: document.querySelector('.zastor'),
  viewer: document.querySelector('#viewer'),
  stanje: document.querySelector('#stanje'),
  info: document.querySelector('#info'),
};

let modeli = [];
let aktivni = null;
let viewer = null;

// --- pomoćne ---------------------------------------------------------------

function h(tag, attrs = {}, ...djeca) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'class') n.className = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...djeca.flat(Infinity).filter((d) => d != null && d !== false));
  return n;
}

const datoteka = (m, ime) => `/modeli/${m.id}/${ime}`;

function napomenaModela(m) {
  return m.atribucija && !m.atribucija.potvrdjeno
    ? 'Ilustrativna 3D digitalizacija · atribucija nepotvrđena'
    : null;
}

// AR Quick Look (iOS/iPadOS Safari) prepoznaje <a rel="ar"> s USDZ datotekom
const podrzavaQuickLook = document.createElement('a').relList.supports?.('ar') ?? false;

function postaviUrl(params, nacin = 'replace') {
  const url = new URL(location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v == null) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  history[nacin === 'push' ? 'pushState' : 'replaceState'](null, '', url);
}

// --- popis -----------------------------------------------------------------

function nacrtajPopis() {
  for (const n of document.querySelectorAll('[data-broj]')) n.textContent = String(modeli.length);
  el.stavke.replaceChildren(
    ...modeli.map((m) =>
      h(
        'li',
        {},
        h(
          'a',
          {
            class: 'stavka',
            href: `?id=${encodeURIComponent(m.id)}`,
            'data-id': m.id,
            onclick: (e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              zatvoriPopis();
              if (m.id !== aktivni?.id) otvoriModel(m, 'push');
            },
          },
          h('span', { class: 'stavka-naziv' }, m.naziv),
          h('span', { class: 'stavka-sazetak' }, m.sazetak),
          m.atribucija && !m.atribucija.potvrdjeno
            ? h('span', { class: 'oznaka' }, 'Atribucija nepotvrđena')
            : null,
        ),
      ),
    ),
  );
}

function oznaciAktivnu() {
  for (const a of el.stavke.querySelectorAll('.stavka')) {
    if (a.dataset.id === aktivni?.id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

// Ispod 1100px popis je ladica — zatvorena ne smije primati fokus ni čitač ekrana
const sirokiZaslon = matchMedia('(min-width: 1100px)');
function azurirajInert() {
  el.popis.inert = !sirokiZaslon.matches && !el.popis.classList.contains('otvoren');
}

function otvoriPopis() {
  el.popis.classList.add('otvoren');
  el.zastor.hidden = false;
  el.gumbPopis.setAttribute('aria-expanded', 'true');
  azurirajInert();
  el.popis.querySelector('.stavka[aria-current]')?.focus();
}

function zatvoriPopis() {
  if (!el.popis.classList.contains('otvoren')) return;
  el.popis.classList.remove('otvoren');
  el.zastor.hidden = true;
  el.gumbPopis.setAttribute('aria-expanded', 'false');
  azurirajInert();
  el.gumbPopis.focus();
}

// --- podaci o modelu -------------------------------------------------------

function nacrtajInfo(m) {
  const varijante = (m.materijali ?? []).filter((v) => v in SPEC.variants);
  const gumbiMaterijala = varijante.map((v) =>
    h(
      'button',
      {
        type: 'button',
        class: 'materijal',
        'data-varijanta': v,
        'aria-pressed': 'false',
        onclick: () => viewer?.setVariant(v),
      },
      h('span', { class: 'materijal-boja', style: `background:${SPEC.variants[v].color}` }),
      SPEC.variants[v].label,
    ),
  );

  const kopiraj = h('button', { type: 'button', class: 'gumb' }, 'Kopiraj poveznicu');
  kopiraj.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      kopiraj.textContent = 'Poveznica kopirana';
    } catch {
      kopiraj.textContent = 'Kopiranje nije uspjelo';
    }
    setTimeout(() => (kopiraj.textContent = 'Kopiraj poveznicu'), 2000);
  });

  el.info.replaceChildren(
    h('h1', { class: 'info-naslov' }, m.naziv),
    h('p', { class: 'info-sazetak' }, m.sazetak),
    m.atribucija
      ? h(
          'div',
          { class: m.atribucija.potvrdjeno ? 'atribucija potvrdjeno' : 'atribucija' },
          h('strong', {}, m.atribucija.potvrdjeno ? 'Atribucija potvrđena' : 'Atribucija nepotvrđena'),
          h('p', {}, m.atribucija.tekst),
        )
      : null,
    gumbiMaterijala.length
      ? h(
          'div',
          { class: 'blok' },
          h('h2', {}, 'Materijal prikaza'),
          h('div', { class: 'materijali', role: 'group', 'aria-label': 'Materijal prikaza' }, gumbiMaterijala),
        )
      : null,
    m.opis ? h('div', { class: 'blok' }, h('h2', {}, 'O modelu'), h('p', {}, m.opis)) : null,
    m.podaci?.length
      ? h(
          'div',
          { class: 'blok' },
          h('h2', {}, 'Podaci'),
          h('dl', { class: 'podaci' }, m.podaci.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
        )
      : null,
    h(
      'div',
      { class: 'akcije' },
      podrzavaQuickLook && m.datoteke.usdz
        ? h(
            'a',
            { class: 'gumb gumb-glavni', rel: 'ar', href: datoteka(m, m.datoteke.usdz) },
            // Quick Look traži <img> kao prvo dijete poveznice
            h('img', { src: '/ar.svg', alt: '', width: '16', height: '16' }),
            'Pogledaj u prostoru (AR)',
          )
        : null,
      h('a', { class: 'gumb', href: datoteka(m, m.datoteke.glb), download: true }, 'Preuzmi GLB'),
      kopiraj,
    ),
    m.povezano
      ? h(
          'p',
          { class: 'povezano' },
          'Povezano: ',
          h('a', { href: m.povezano.url, rel: 'noopener' }, m.povezano.naziv),
        )
      : null,
  );
}

function oznaciMaterijal(v) {
  for (const b of el.info.querySelectorAll('.materijal')) {
    b.setAttribute('aria-pressed', String(b.dataset.varijanta === v));
  }
}

// --- otvaranje modela ------------------------------------------------------

function otvoriModel(m, nacin = 'replace') {
  aktivni = m;
  viewer?.dispose();
  el.stanje.textContent = 'Učitavam model…';
  el.stanje.hidden = false;

  // Materijal iz adrese vrijedi samo za model s kojim je poveznica podijeljena
  const url = new URL(location.href);
  if (url.searchParams.get('id') !== m.id) postaviUrl({ id: m.id, materijal: null }, nacin);

  document.title = `${m.naziv} · 3D modeli DBHZ`;
  nacrtajInfo(m);
  oznaciAktivnu();

  viewer = createModelViewer(el.viewer, {
    modelUrl: datoteka(m, m.datoteke.glb),
    materijali: m.materijali,
    napomena: napomenaModela(m),
    onVariantChange: (v) => {
      oznaciMaterijal(v);
      postaviUrl({ materijal: v === SPEC.defaultVariant ? null : v });
    },
    onError: () => {
      el.stanje.textContent = 'Model se nije mogao učitati. Pokušajte osvježiti stranicu.';
      el.stanje.hidden = false;
    },
  });
  oznaciMaterijal(viewer.getVariant());
}

// Skrij poruku o učitavanju kad viewer javi da je model u sceni
new MutationObserver(() => {
  if (el.viewer.dataset.stanje === 'ucitano') el.stanje.hidden = true;
}).observe(el.viewer, { attributes: true, attributeFilter: ['data-stanje'] });

function modelIzAdrese() {
  const id = new URLSearchParams(location.search).get('id');
  return modeli.find((m) => m.id === id) ?? modeli[0];
}

// --- start -----------------------------------------------------------------

el.gumbPopis.addEventListener('click', () =>
  el.popis.classList.contains('otvoren') ? zatvoriPopis() : otvoriPopis(),
);
el.zastor.addEventListener('click', zatvoriPopis);
sirokiZaslon.addEventListener('change', azurirajInert);
azurirajInert();
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') zatvoriPopis();
});
window.addEventListener('popstate', () => {
  const m = modelIzAdrese();
  if (m && m.id !== aktivni?.id) otvoriModel(m);
});

try {
  const res = await fetch('/modeli/katalog.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  modeli = (await res.json()).modeli;
  nacrtajPopis();
  otvoriModel(modelIzAdrese());
} catch (err) {
  console.error(err);
  el.stanje.textContent = 'Katalog se nije mogao učitati. Pokušajte osvježiti stranicu.';
}
