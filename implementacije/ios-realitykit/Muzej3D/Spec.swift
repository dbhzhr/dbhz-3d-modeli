// Sve VIEWER-SPEC vrijednosti na jednom mjestu — ne raspršivati po kodu.
import SwiftUI

enum Spec {
    static let background = Color(red: 0x0C / 255, green: 0x1C / 255, blue: 0x13 / 255)
    static let activeRing = Color(red: 0xD9 / 255, green: 0x9E / 255, blue: 0x12 / 255)
    static let buttonBg = Color(red: 0x06 / 255, green: 0x27 / 255, blue: 0x16 / 255).opacity(0.55)

    static let elevationDeg: Float = 8 // polar fiksan: 8° iznad horizonta
    static let fovYDeg: Float = 40
    static let zoomMin: Float = 2.2
    static let zoomMax: Float = 9
    static let initialDistance: Float = 3.6
    static let autoRotateDegPerS: Float = 360 / 66 // puni krug ~66 s
    static let autoRotateResumeS: Float = 1.5
    static let lerpRate: Float = 4.5 // k = 1 − e^(−4.5·dt), ~1 s
    static let dampingRate: Float = 4
    static let dragDegPerPt: Float = 0.4

    // FitCamera formula (VIEWER-SPEC poglavlje 3)
    static let fitWidthMargin: Float = 1.2
    static let fitHeightMargin: Float = 1.15
    static let fitDepthComp: Float = 0.35

    struct Variant: Equatable, Identifiable {
        let id: String
        let label: String
        let srgb: (Float, Float, Float) // 0–1 sRGB (UI boja)
        let metallic: Float
        let roughness: Float

        static func == (a: Variant, b: Variant) -> Bool { a.id == b.id }

        var uiColor: Color { Color(red: Double(srgb.0), green: Double(srgb.1), blue: Double(srgb.2)) }
        /// RealityKit PhysicallyBasedMaterial baseColor očekuje UIColor (sRGB).
        var baseColor: SIMD3<Float> { [srgb.0, srgb.1, srgb.2] }
    }

    static let variants: [Variant] = [
        .init(id: "bronca", label: "Bronca",
              srgb: (0xB0 / 255, 0x7D / 255, 0x44 / 255), metallic: 0.78, roughness: 0.42),
        .init(id: "kamen", label: "Brački kamen",
              srgb: (0xE9 / 255, 0xE4 / 255, 0xD3 / 255), metallic: 0.02, roughness: 0.93),
        .init(id: "patina", label: "Bronca s patinom",
              srgb: (0x5B / 255, 0x9B / 255, 0x82 / 255), metallic: 0.28, roughness: 0.74),
    ]

    static let modelName = "tomislav-bista" // Resources/tomislav-bista.usdz
    static let attribution =
        "Ilustrativna 3D digitalizacija — atribucija nepotvrđena (potvrditi prije objave)."
}
