// Entry za esbuild bundle (v. build-viewer.mjs). __GLB_DATA_URI__ se injektira
// kroz esbuild define pri buildu.
import { createBistaViewer } from '../../web-vanilla/bista-viewer.js';

const viewer = createBistaViewer(document.getElementById('viewer'), {
  modelUrl: __GLB_DATA_URI__,
});

// Most prema React Native strani: RN šalje JSON poruke kroz postMessage.
// (Android WebView dostavlja na document, iOS na window — slušamo oboje.)
function onMessage(e) {
  try {
    const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (msg && msg.type === 'setVariant') viewer.setVariant(msg.variant);
  } catch {
    /* ignoriraj tuđe poruke */
  }
}
window.addEventListener('message', onMessage);
document.addEventListener('message', onMessage);
