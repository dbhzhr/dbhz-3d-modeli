// Kopira katalog i datoteke modela iz ../modeli u public/modeli, odakle ih
// Vite prenosi u dist/. Izvor istine ostaje ../modeli — public/modeli se ne commita.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, '..', 'modeli');
const dest = join(root, 'public', 'modeli');

const katalog = JSON.parse(readFileSync(join(src, 'katalog.json'), 'utf8'));
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(join(src, 'katalog.json'), join(dest, 'katalog.json'));

const ids = new Set();
for (const m of katalog.modeli) {
  if (ids.has(m.id)) throw new Error(`Dupli id u katalogu: ${m.id}`);
  ids.add(m.id);
  if (!m.datoteke?.glb) throw new Error(`Model ${m.id} nema datoteke.glb`);
  for (const file of Object.values(m.datoteke)) {
    const from = join(src, m.id, file);
    if (!existsSync(from)) throw new Error(`Nedostaje datoteka: modeli/${m.id}/${file}`);
    mkdirSync(join(dest, m.id), { recursive: true });
    cpSync(from, join(dest, m.id, file));
  }
}
console.log(`katalog: ${katalog.modeli.length} model(a) → public/modeli`);
