// 3D viewer — SwiftUI + RealityKit port docs/VIEWER-SPEC.md (plan docs/05):
//
//  - kamera FIKSNA (8° elevacije, fovY 40°); rotira se ENTITY oko Y osi
//    (drag + auto-rotate s dampingom) — polar zaključan by design
//  - pinch mijenja udaljenost kamere (2.2–9); FitCamera formula na promjenu
//    veličine viewporta (GeometryReader) i nakon učitavanja modela
//  - materijali: PhysicallyBasedMaterial, ANIMIRANI prijelaz u SceneEvents.Update
//    petlji (k = 1 − e^(−4.5·dt)) — reassign materijala je jeftin (jedan mesh)
//  - druga instanca (fullscreen) učitava vlastiti entity — scena se ne dijeli
import RealityKit
import SwiftUI

/// Po-instanci runtime stanje kojim upravlja render petlja (ne SwiftUI).
final class ViewerRuntime {
    var yawDeg: Float = 0
    var yawVelocity: Float = 0
    var lastInteraction: TimeInterval = 0
    var distance: Float = Spec.initialDistance
    var fitDistance: Float = Spec.initialDistance
    var viewSize: CGSize = .zero
    // trenutne (animirane) vrijednosti materijala
    var cur: (SIMD3<Float>, Float, Float) = (Spec.variants[0].baseColor, Spec.variants[0].metallic, Spec.variants[0].roughness)
    var target: Spec.Variant = Spec.variants[0]

    var model: Entity?
    var camera: PerspectiveCamera?
    var subscription: EventSubscription?
    var lastDragTranslation: CGFloat = 0
    var pinchStartDistance: Float?

    /// FitCamera (VIEWER-SPEC poglavlje 3) — cijeli model u kadru po visini I širini.
    func refitCamera() {
        guard let model, viewSize.width > 0, viewSize.height > 0 else { return }
        let bounds = model.visualBounds(relativeTo: nil)
        let halfH = bounds.extents.y / 2
        let rXZ = hypot(bounds.extents.x, bounds.extents.z) / 2
        let vTan = tan(Spec.fovYDeg * .pi / 180 / 2)
        let hTan = vTan * Float(viewSize.width / viewSize.height)
        let distW = rXZ * (Spec.fitWidthMargin / hTan + 1)
        let distV = Spec.fitHeightMargin * halfH / vTan + Spec.fitDepthComp * rXZ
        let target = min(max(max(distV, distW), Spec.zoomMin), Spec.zoomMax)
        let userZoom = distance / fitDistance
        fitDistance = target
        distance = min(max(target * userZoom, Spec.zoomMin), Spec.zoomMax)
    }

    func frame(dt: Float, now: TimeInterval) {
        // 1) rotacija entityja: damping + auto-rotate nakon pauze
        if lastInteraction == 0 || Float(now - lastInteraction) > Spec.autoRotateResumeS {
            yawDeg += Spec.autoRotateDegPerS * dt
        } else {
            yawVelocity *= exp(-Spec.dampingRate * dt)
            yawDeg += yawVelocity * dt
        }
        model?.orientation = simd_quatf(angle: yawDeg * .pi / 180, axis: [0, 1, 0])

        // 2) kamera: fiksan smjer (8° elevacije), mijenja se samo udaljenost
        if let camera {
            let elev = Spec.elevationDeg * .pi / 180
            let pos = SIMD3<Float>(0, distance * sin(elev), distance * cos(elev))
            camera.look(at: .zero, from: pos, relativeTo: nil)
        }

        // 3) ANIMIRANI prijelaz materijala
        let k = 1 - exp(-Spec.lerpRate * dt)
        cur.0 += (target.baseColor - cur.0) * k
        cur.1 += (target.metallic - cur.1) * k
        cur.2 += (target.roughness - cur.2) * k
        applyMaterial()
    }

    func applyMaterial() {
        guard let model else { return }
        var pbm = PhysicallyBasedMaterial()
        pbm.baseColor = .init(tint: UIColor(
            red: CGFloat(cur.0.x), green: CGFloat(cur.0.y), blue: CGFloat(cur.0.z), alpha: 1))
        pbm.metallic = .init(floatLiteral: cur.1)
        pbm.roughness = .init(floatLiteral: cur.2)
        model.replaceMaterials(pbm)
    }
}

extension Entity {
    /// Postavi isti materijal na sve ModelEntity potomke (model je jedan mesh).
    func replaceMaterials(_ material: RealityKit.Material) {
        if var model = components[ModelComponent.self] {
            model.materials = [material]
            components.set(model)
        }
        for child in children { child.replaceMaterials(material) }
    }
}

struct BistaViewerView: View {
    @Binding var variant: Spec.Variant
    let fullscreen: Bool
    let onToggleFullscreen: () -> Void

    @State private var runtime = ViewerRuntime()

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .topLeading) {
                RealityView { content in
                    content.camera = .virtual
                    let camera = PerspectiveCamera()
                    camera.camera.fieldOfViewInDegrees = Spec.fovYDeg
                    content.add(camera)
                    runtime.camera = camera

                    // Svjetla po spec-u (poglavlje 5) — eksplicitna, jer se default
                    // osvjetljenje na simulatoru zna izgubiti nakon rotacije ekrana.
                    let key = DirectionalLight()
                    key.light.intensity = 4000
                    key.look(at: .zero, from: [4, 6, 5], relativeTo: nil)
                    content.add(key)
                    let fill = DirectionalLight()
                    fill.light.intensity = 1300
                    fill.light.color = UIColor(red: 1, green: 0.9, blue: 0.69, alpha: 1)
                    fill.look(at: .zero, from: [-5, 2, -3], relativeTo: nil)
                    content.add(fill)

                    if let entity = try? await Entity(named: Spec.modelName) {
                        // model je centriran i normaliziran u pipelineu; sidrimo ga u ishodištu
                        content.add(entity)
                        runtime.model = entity
                        runtime.viewSize = geo.size
                        runtime.refitCamera()
                    }

                    // render petlja — sve po-frame ponašanje živi u ViewerRuntime;
                    // veličina se čita svaki frame (rotacija ekrana → refit)
                    runtime.subscription = content.subscribe(to: SceneEvents.Update.self) { ev in
                        runtime.target = variant
                        let size = geo.size
                        if size != runtime.viewSize {
                            runtime.viewSize = size
                            runtime.refitCamera()
                        }
                        runtime.frame(dt: Float(ev.deltaTime), now: Date().timeIntervalSince1970)
                    }
                }
                .background(Spec.background)
                .onChange(of: geo.size) { _, size in
                    runtime.viewSize = size
                    runtime.refitCamera()
                }
                .gesture(
                    DragGesture(minimumDistance: 2)
                        .onChanged { value in
                            let delta = Float(value.translation.width - runtime.lastDragTranslation)
                            runtime.lastDragTranslation = value.translation.width
                            runtime.yawDeg += delta * Spec.dragDegPerPt
                            runtime.yawVelocity = delta * Spec.dragDegPerPt * 60
                            runtime.lastInteraction = Date().timeIntervalSince1970
                        }
                        .onEnded { _ in runtime.lastDragTranslation = 0 }
                )
                .simultaneousGesture(
                    MagnificationGesture()
                        .onChanged { scale in
                            let start = runtime.pinchStartDistance ?? runtime.distance
                            runtime.pinchStartDistance = start
                            runtime.distance = min(max(start / Float(scale), Spec.zoomMin), Spec.zoomMax)
                            runtime.lastInteraction = Date().timeIntervalSince1970
                        }
                        .onEnded { _ in runtime.pinchStartDistance = nil }
                )

                controls
            }
        }
        .background(Spec.background)
    }

    private var controls: some View {
        ZStack(alignment: .topLeading) {
            // Swatchevi (gore lijevo) — aktivni: bijeli rub + zlatni prsten
            HStack(spacing: 8) {
                ForEach(Spec.variants) { v in
                    Circle()
                        .fill(v.uiColor)
                        .frame(width: 26, height: 26)
                        .overlay(Circle().strokeBorder(
                            v == variant ? Color.white : Color.white.opacity(0.35), lineWidth: 2))
                        .background(Circle().stroke(
                            v == variant ? Spec.activeRing : .clear, lineWidth: 4).padding(-2))
                        .onTapGesture { variant = v }
                        .accessibilityLabel(v.label)
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)

            // Fullscreen gumb (gore desno)
            HStack {
                Spacer()
                Button(action: onToggleFullscreen) {
                    Image(systemName: fullscreen
                        ? "arrow.down.right.and.arrow.up.left"
                        : "arrow.up.left.and.arrow.down.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 30, height: 30)
                        .background(Spec.buttonBg, in: RoundedRectangle(cornerRadius: 8))
                }
                .accessibilityLabel(fullscreen ? "Izađi iz punog zaslona" : "Puni zaslon")
            }
            .padding(10)

            // Atribucijski caveat (v. modeli/tomislav-bista/README.md)
            VStack {
                Spacer()
                Text(Spec.attribution)
                    .font(.system(size: 11))
                    .foregroundStyle(.white.opacity(0.45))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 10)
                    .padding(.bottom, 8)
            }
        }
    }
}
