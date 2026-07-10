// DBHZ digitalni muzej — Flutter viewer (Put 1 iz docs/03-flutter.md):
// model_viewer_plus = Googleov <model-viewer> u WebView-u. Polar lock, zoom i
// auto-rotate idu kroz model-viewer atribute; ANIMIRANI prijelaz materijala i
// swatchevi kroz JS injection (relatedJs + innerModelViewerHtml — v. Spec.js).
//
// Fullscreen: nova full-screen ruta na root razini navigacije (pravilo iz
// VIEWER-SPEC: overlay nikad duboko u stablu) s vlastitom ModelViewer instancom.
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';

import 'js_inject_stub.dart' if (dart.library.js_interop) 'js_inject_web.dart';

/// Sve VIEWER-SPEC vrijednosti na jednom mjestu — ne raspršivati po kodu.
abstract final class Spec {
  static const background = Color(0xFF0C1C13);
  static const activeRing = Color(0xFFD99E12);

  static const polarDeg = 82; // 8° iznad horizonta, min == max => zaključano
  static const zoomMin = 2.2, zoomMax = 9.0; // model 2 jedinice ≙ metri 1:1
  static const initialDistance = 3.6;
  static const fovDeg = 40;
  static const rotationPerSecond = '5.45deg'; // puni krug ~66 s

  static const cameraOrbit = '0deg ${polarDeg}deg ${initialDistance}m';
  static const minCameraOrbit = 'auto ${polarDeg}deg ${zoomMin}m';
  static const maxCameraOrbit = 'auto ${polarDeg}deg ${zoomMax}m';
  static const fieldOfView = '${fovDeg}deg';

  static const attribution =
      'Ilustrativna 3D digitalizacija — atribucija nepotvrđena (potvrditi prije objave).';

  /// GLB derivat s glatkim normalama + upisanim materijalom (v. README).
  static String get modelSrc =>
      kIsWeb ? 'assets/assets/tomislav-bista.glb' : 'assets/tomislav-bista.glb';

  /// Swatchevi žive u HTML-u (slot unutar <model-viewer>) jer prijelaz
  /// materijala mora ići kroz model-viewer material API u WebView-u.
  static const innerHtml = '''
<div id="swatchevi" style="position:absolute;top:10px;left:10px;display:flex;gap:8px"></div>
<div style="position:absolute;bottom:8px;left:10px;right:10px;color:rgba(255,255,255,0.45);font:11px/1.3 system-ui,sans-serif;pointer-events:none">$attribution</div>
''';

  /// Materijalne varijante + animirani lerp (k = 1 − e^(−4.5·dt)) — identična
  /// logika kao implementacije/web-model-viewer.
  ///
  /// Inicijalizira SVAKI <model-viewer> koji nađe (i kroz shadow DOM — Flutter
  /// web platform view), pa isti kod radi u mobilnom WebView-u (relatedJs) i
  /// na webu (injektiran kroz injectJsOnce; interval hvata i instancu koja se
  /// pojavi kasnije na fullscreen ruti).
  static String relatedJs(String initialVariant) => '''
(() => {
  if (window.__bistaSetupInstalled) return;
  window.__bistaSetupInstalled = true;
  const SPEC = {
    lerpRate: 4.5,
    activeRing: '#D99E12',
    variants: {
      bronca: { color: '#b07d44', metalness: 0.78, roughness: 0.42, label: 'Bronca' },
      kamen:  { color: '#e9e4d3', metalness: 0.02, roughness: 0.93, label: 'Brački kamen' },
      patina: { color: '#5b9b82', metalness: 0.28, roughness: 0.74, label: 'Bronca s patinom' },
    },
    order: ['bronca', 'kamen', 'patina'],
  };
  const hexToLinear = (hex) => {
    const s2l = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const n = parseInt(hex.slice(1), 16);
    return [s2l(((n >> 16) & 255) / 255), s2l(((n >> 8) & 255) / 255), s2l((n & 255) / 255), 1];
  };
  function* walk(root) {
    for (const el of root.querySelectorAll('*')) {
      yield el;
      if (el.shadowRoot) yield* walk(el.shadowRoot);
    }
  }
  function init(mv) {
    if (mv.__bistaInit || !mv.getCameraOrbit) return;
    const wrap = mv.querySelector('#swatchevi');
    if (!wrap) return;
    mv.__bistaInit = true;
    let variant = '$initialVariant';
    let cur = { ...SPEC.variants[variant], rgba: hexToLinear(SPEC.variants[variant].color) };
    const swatches = {};
    for (const v of SPEC.order) {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = SPEC.variants[v].label;
      b.setAttribute('aria-label', SPEC.variants[v].label);
      b.style.cssText = 'width:26px;height:26px;border-radius:50%;cursor:pointer;padding:0;background:' + SPEC.variants[v].color;
      b.addEventListener('click', () => { variant = v; sync(); });
      wrap.appendChild(b);
      swatches[v] = b;
    }
    function sync() {
      for (const v of SPEC.order) {
        const on = v === variant;
        swatches[v].style.border = on ? '2px solid #fff' : '2px solid rgba(255,255,255,0.35)';
        swatches[v].style.boxShadow = on ? '0 0 0 2px ' + SPEC.activeRing : '0 1px 4px rgba(0,0,0,0.4)';
        swatches[v].setAttribute('aria-pressed', String(on));
      }
    }
    sync();
    let last = 0;
    function tick(now) {
      requestAnimationFrame(tick);
      const mat = mv.model && mv.model.materials && mv.model.materials[0];
      if (!mat) return;
      const dt = Math.min((now - (last || now)) / 1000, 0.1);
      last = now;
      const t = SPEC.variants[variant];
      const target = hexToLinear(t.color);
      const k = 1 - Math.exp(-SPEC.lerpRate * dt);
      cur.rgba = cur.rgba.map((c, i) => c + (target[i] - c) * k);
      cur.metalness += (t.metalness - cur.metalness) * k;
      cur.roughness += (t.roughness - cur.roughness) * k;
      const pbr = mat.pbrMetallicRoughness;
      pbr.setBaseColorFactor(cur.rgba);
      pbr.setMetallicFactor(cur.metalness);
      pbr.setRoughnessFactor(cur.roughness);
    }
    requestAnimationFrame(tick);
    // Debug za verifikaciju (chrome-devtools MCP)
    mv.__bista = { get variant() { return variant; }, set variant(v) { variant = v; sync(); } };
  }
  function sweep() {
    for (const el of walk(document)) if (el.tagName === 'MODEL-VIEWER') init(el);
  }
  sweep();
  setInterval(sweep, 800);
})();
''';
}

void main() => runApp(const MuzejApp());

class MuzejApp extends StatelessWidget {
  const MuzejApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DBHZ 3D muzej',
      theme: ThemeData(brightness: Brightness.dark, scaffoldBackgroundColor: const Color(0xFF081209)),
      home: const KatalogEkran(),
    );
  }
}

class KatalogEkran extends StatelessWidget {
  const KatalogEkran({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bista kralja Tomislava'),
        backgroundColor: const Color(0xFF081209),
      ),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: const BistaViewer(),
        ),
      ),
    );
  }
}

/// Viewer + fullscreen gumb. Za fullscreen se gura NOVA ruta na root navigatoru
/// s NOVOM ModelViewer instancom (WebView se ne dijeli između ruta).
class BistaViewer extends StatefulWidget {
  const BistaViewer({super.key, this.fullscreen = false, this.initialVariant = 'bronca'});

  final bool fullscreen;
  final String initialVariant;

  @override
  State<BistaViewer> createState() => _BistaViewerState();
}

class _BistaViewerState extends State<BistaViewer> {
  @override
  void initState() {
    super.initState();
    // Na webu relatedJs iz model_viewer_plus ne radi (innerHTML ne izvršava
    // skripte) — ubaci isti JS ručno; interval u skripti hvata sve instance.
    if (kIsWeb) injectJsOnce(Spec.relatedJs(widget.initialVariant));
  }

  @override
  Widget build(BuildContext context) {
    final fullscreen = widget.fullscreen;
    return Stack(
      children: [
        Positioned.fill(
          child: ModelViewer(
            src: Spec.modelSrc,
            alt: 'Bista kralja Tomislava',
            backgroundColor: Spec.background,
            cameraControls: true,
            disablePan: true,
            autoRotate: true,
            rotationPerSecond: Spec.rotationPerSecond,
            interactionPrompt: InteractionPrompt.none,
            cameraOrbit: Spec.cameraOrbit,
            minCameraOrbit: Spec.minCameraOrbit,
            maxCameraOrbit: Spec.maxCameraOrbit,
            fieldOfView: Spec.fieldOfView,
            minFieldOfView: Spec.fieldOfView,
            maxFieldOfView: Spec.fieldOfView,
            shadowIntensity: 0.5,
            shadowSoftness: 1,
            ar: true,
            arModes: const ['webxr', 'scene-viewer', 'quick-look'],
            innerModelViewerHtml: Spec.innerHtml,
            relatedJs: Spec.relatedJs(widget.initialVariant),
          ),
        ),
        Positioned(
          top: 10,
          right: 10,
          child: IconButton.filledTonal(
            style: IconButton.styleFrom(backgroundColor: const Color(0x8C062716)),
            icon: Icon(fullscreen ? Icons.fullscreen_exit : Icons.fullscreen, color: Colors.white, size: 20),
            tooltip: fullscreen ? 'Izađi iz punog zaslona' : 'Puni zaslon',
            onPressed: () {
              if (fullscreen) {
                Navigator.of(context).pop();
              } else {
                // Full-screen ruta na root navigatoru — ekvivalent portala u body.
                Navigator.of(context, rootNavigator: true).push(
                  MaterialPageRoute(
                    fullscreenDialog: true,
                    builder: (_) => const Scaffold(
                      backgroundColor: Spec.background,
                      body: SafeArea(child: BistaViewer(fullscreen: true)),
                    ),
                  ),
                );
              }
            },
          ),
        ),
      ],
    );
  }
}
