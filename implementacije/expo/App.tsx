// DBHZ digitalni muzej — Expo viewer (Put 1 iz docs/02-expo-react-native.md):
// provjereni web viewer (implementacije/web-vanilla) bundlan OFFLINE kao
// samodostatan HTML string (three.js + GLB data URI, v. scripts/build-viewer.mjs)
// i prikazan u WebView-u; na webu ista stranica u <iframe srcDoc>.
//
// Sve kontrole (swatchevi, fullscreen, atribucijska napomena) žive U vieweru —
// RN strana dodatno demonstrira postMessage most (gumbi ispod viewera).
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { viewerHtml } from './src/viewerHtml';

// Spec vrijednosti potrebne RN strani (viewer ima svoju SPEC konstantu u bundlu)
const SPEC = {
  background: '#0c1c13',
  ui: { activeRing: '#D99E12' },
  variants: {
    bronca: { color: '#b07d44', label: 'Bronca' },
    kamen: { color: '#e9e4d3', label: 'Brački kamen' },
    patina: { color: '#5b9b82', label: 'Bronca s patinom' },
  } as const,
  variantOrder: ['bronca', 'kamen', 'patina'] as const,
};
type Variant = (typeof SPEC.variantOrder)[number];

// WebView se ne importa na webu (react-native-webview nema web implementaciju)
const WebView = Platform.OS === 'web' ? null : require('react-native-webview').WebView;

export default function App() {
  const webviewRef = useRef<{ postMessage: (msg: string) => void } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [variant, setVariant] = useState<Variant>('bronca');

  // postMessage most: RN gumb -> viewer (viewer sluša {type:'setVariant'})
  const send = (v: Variant) => {
    setVariant(v);
    const msg = JSON.stringify({ type: 'setVariant', variant: v });
    if (Platform.OS === 'web') iframeRef.current?.contentWindow?.postMessage(msg, '*');
    else webviewRef.current?.postMessage(msg);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Text style={styles.title}>Bista kralja Tomislava</Text>
      <View style={styles.viewerBox}>
        {Platform.OS === 'web' ? (
          // Na webu ista stranica direktno — iframe je srcDoc (same-origin)
          <iframe
            ref={iframeRef}
            srcDoc={viewerHtml}
            style={{ border: 0, width: '100%', height: '100%' }}
            title="3D viewer"
          />
        ) : (
          <WebView
            ref={webviewRef}
            originWhitelist={['*']}
            source={{ html: viewerHtml }}
            style={{ backgroundColor: SPEC.background }}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            setBuiltInZoomControls={false}
          />
        )}
      </View>
      {/* Demo postMessage mosta: materijal se može mijenjati i iz RN UI-ja */}
      <View style={styles.controls}>
        {SPEC.variantOrder.map((v) => (
          <Pressable
            key={v}
            accessibilityLabel={SPEC.variants[v].label}
            onPress={() => send(v)}
            style={[
              styles.swatch,
              { backgroundColor: SPEC.variants[v].color },
              variant === v && styles.swatchActive,
            ]}
          />
        ))}
        <Text style={styles.controlsLabel}>RN → viewer (postMessage)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#081209', paddingTop: 60 },
  title: { color: '#e8efe9', fontSize: 18, fontWeight: '600', paddingHorizontal: 16, paddingBottom: 12 },
  viewerBox: { flex: 1, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  swatchActive: {
    borderColor: '#fff',
    shadowColor: SPEC.ui.activeRing,
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 4,
  },
  controlsLabel: { color: 'rgba(232,239,233,0.5)', fontSize: 12 },
});
