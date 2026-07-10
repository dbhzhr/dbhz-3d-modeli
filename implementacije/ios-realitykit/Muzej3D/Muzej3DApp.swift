// DBHZ digitalni muzej — iOS app (SwiftUI + RealityKit).
// Fullscreen ide kroz fullScreenCover NA ROOT razini (pravilo iz VIEWER-SPEC:
// overlay nikad duboko u stablu) s vlastitom instancom viewera.
// Deep-link: dbhz3d://materijal/kamen (spec: parametar `materijal`).
import SwiftUI

@main
struct Muzej3DApp: App {
    @State private var variant = Spec.variants[0]
    @State private var fullscreen = false

    var body: some Scene {
        WindowGroup {
            ZStack(alignment: .topLeading) {
                Color(red: 0x08 / 255, green: 0x12 / 255, blue: 0x09 / 255).ignoresSafeArea()
                VStack(alignment: .leading, spacing: 12) {
                    Text("Bista kralja Tomislava")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Color(red: 0xE8 / 255, green: 0xEF / 255, blue: 0xE9 / 255))
                        .padding(.horizontal, 16)
                    // Dok je fullscreen otvoren, inline instanca se gasi — dvije
                    // istovremene RealityView scene na simulatoru ne renderiraju
                    // pouzdano, a spec ionako traži NOVU instancu, ne dijeljenje.
                    Group {
                        if fullscreen {
                            Spec.background
                        } else {
                            BistaViewerView(variant: $variant, fullscreen: false) {
                                fullscreen = true
                            }
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal, 12)
                    .padding(.bottom, 16)
                }
            }
            .fullScreenCover(isPresented: $fullscreen) {
                ZStack {
                    Spec.background.ignoresSafeArea() // scena pokriva SVE
                    BistaViewerView(variant: $variant, fullscreen: true) {
                        fullscreen = false
                    }
                }
            }
            .onOpenURL { url in
                guard url.scheme == "dbhz3d" else { return }
                switch url.host {
                case "materijal": // dbhz3d://materijal/<id>
                    let id = url.lastPathComponent
                    if let v = Spec.variants.first(where: { $0.id == id }) { variant = v }
                case "fullscreen": // dbhz3d://fullscreen/on|off
                    fullscreen = url.lastPathComponent == "on"
                default:
                    break
                }
            }
        }
    }
}
