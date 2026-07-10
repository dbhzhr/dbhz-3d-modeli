import BistaViewer from './BistaViewer';

export default function App() {
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <BistaViewer modelUrl="/models/tomislav-bista.glb" initialDistance={4.8} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 16,
          textAlign: 'center',
          color: '#f7f8f4',
          fontFamily: "'Titillium Web', system-ui, sans-serif",
          fontSize: 14,
          opacity: 0.85,
          pointerEvents: 'none',
        }}
      >
        <strong>Bista kralja Tomislava</strong> · povuci lijevo-desno za rotaciju (360°)
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Pogled je fiksiran u razini stola — bista se vrti samo oko vertikalne osi.
          Kružići gore lijevo mijenjaju materijal (bronca · brački kamen · patina), ikona desno otvara puni zaslon.
        </div>
      </div>
    </div>
  );
}
