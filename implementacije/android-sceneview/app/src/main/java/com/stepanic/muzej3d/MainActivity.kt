// DBHZ digitalni muzej — Android nativni viewer (Kotlin + Jetpack Compose +
// SceneView/Filament), port docs/VIEWER-SPEC.md po planu docs/04:
//
//  - kamera FIKSNA na 8° elevacije; rotira se MODEL oko Y (drag + auto-rotate
//    s dampingom) — polar je zaključan by design jer kameru ništa ne miče
//  - pinch mijenja udaljenost kamere (2.2–9), FitCamera formula kadrira na
//    promjenu veličine viewporta
//  - materijali: Filament MaterialInstance faktori (baseColor/metallic/roughness),
//    ANIMIRANI prijelaz k = 1 − e^(−4.5·dt) u onFrame petlji
//  - fullscreen: Dialog na root razini s VLASTITOM SceneView instancom
//    (vlastiti Engine — 3D resursi se ne dijele između scena)
package com.stepanic.muzej3d

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import io.github.sceneview.SceneView
import io.github.sceneview.math.Position
import io.github.sceneview.math.Rotation
import io.github.sceneview.model.model
import io.github.sceneview.node.ModelNode
import io.github.sceneview.rememberCameraNode
import io.github.sceneview.rememberEngine
import io.github.sceneview.rememberModelInstance
import io.github.sceneview.rememberModelLoader
import io.github.sceneview.rememberOnGestureListener
import kotlin.math.atan
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.sin
import kotlin.math.tan

/** Sve VIEWER-SPEC vrijednosti na jednom mjestu — ne raspršivati po kodu. */
object Spec {
    val background = Color(0xFF0C1C13)
    val activeRing = Color(0xFFD99E12)
    val buttonBg = Color(0x8C062716)

    const val ELEVATION_DEG = 8f // polar fiksan: 8° iznad horizonta
    const val FOV_Y_DEG = 40.0
    const val ZOOM_MIN = 2.2f
    const val ZOOM_MAX = 9f
    const val INITIAL_DISTANCE = 3.6f
    const val AUTO_ROTATE_DEG_PER_S = 360f / 66f // puni krug ~66 s
    const val AUTO_ROTATE_RESUME_MS = 1500L
    const val LERP_RATE = 4.5f // k = 1 − e^(−4.5·dt), prijelaz ~1 s
    const val DRAG_DEG_PER_PX = 0.25f
    const val DAMPING_RATE = 4f // prigušenje kutne brzine nakon otpuštanja

    // FitCamera formula (VIEWER-SPEC poglavlje 3)
    const val FIT_WIDTH_MARGIN = 1.2f
    const val FIT_HEIGHT_MARGIN = 1.15f
    const val FIT_DEPTH_COMP = 0.35f

    data class Variant(
        val key: String,
        val label: String,
        val srgb: Long, // #rrggbb
        val metallic: Float,
        val roughness: Float,
    ) {
        /** glTF baseColorFactor je u LINEARNOM prostoru. */
        val linear: FloatArray by lazy {
            fun s2l(c: Int): Float {
                val v = c / 255f
                return if (v <= 0.04045f) v / 12.92f else Math.pow(((v + 0.055f) / 1.055f).toDouble(), 2.4).toFloat()
            }
            floatArrayOf(s2l((srgb shr 16).toInt() and 255), s2l((srgb shr 8).toInt() and 255), s2l(srgb.toInt() and 255))
        }
        val composeColor get() = Color(0xFF000000 or srgb)
    }

    val variants = listOf(
        Variant("bronca", "Bronca", 0xB07D44, 0.78f, 0.42f),
        Variant("kamen", "Brački kamen", 0xE9E4D3, 0.02f, 0.93f),
        Variant("patina", "Bronca s patinom", 0x5B9B82, 0.28f, 0.74f),
    )

    const val MODEL_ASSET = "models/tomislav-bista.glb"
    const val ATTRIBUTION =
        "Ilustrativna 3D digitalizacija — atribucija nepotvrđena (potvrditi prije objave)."

    /** Filament focal length (35 mm ekvivalent, senzor visine 24 mm) za fovY 40°. */
    val FOCAL_LENGTH_MM = 12.0 / tan(Math.toRadians(FOV_Y_DEG / 2))
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var fullscreen by remember { mutableStateOf(false) }
            var variant by remember { mutableStateOf(Spec.variants[0]) }

            Box(Modifier.fillMaxSize().background(Color(0xFF081209))) {
                Text(
                    "Bista kralja Tomislava",
                    color = Color(0xFFE8EFE9),
                    fontSize = 18.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 48.dp),
                )
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(top = 90.dp, start = 12.dp, end = 12.dp, bottom = 24.dp)
                ) {
                    BistaViewer(
                        variant = variant,
                        onVariant = { variant = it },
                        fullscreen = false,
                        onToggleFullscreen = { fullscreen = true },
                    )
                }

                // Fullscreen na ROOT razini (ekvivalent portala u document.body):
                // Dialog preko cijelog ekrana s NOVOM SceneView instancom.
                if (fullscreen) {
                    Dialog(
                        onDismissRequest = { fullscreen = false },
                        properties = DialogProperties(
                            usePlatformDefaultWidth = false,
                            decorFitsSystemWindows = false,
                        ),
                    ) {
                        Box(Modifier.fillMaxSize().background(Spec.background)) {
                            BistaViewer(
                                variant = variant,
                                onVariant = { variant = it },
                                fullscreen = true,
                                onToggleFullscreen = { fullscreen = false },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BistaViewer(
    variant: Spec.Variant,
    onVariant: (Spec.Variant) -> Unit,
    fullscreen: Boolean,
    onToggleFullscreen: () -> Unit,
) {
    val engine = rememberEngine()
    val modelLoader = rememberModelLoader(engine)
    val modelInstance = rememberModelInstance(modelLoader, Spec.MODEL_ASSET)

    // Interakcijsko stanje (van Compose recomposition petlje — mijenja se u onFrame)
    val yawDeg = remember { mutableFloatStateOf(0f) }
    val yawVelocity = remember { mutableFloatStateOf(0f) }
    val lastInteraction = remember { mutableLongStateOf(0L) }
    val distance = remember { mutableFloatStateOf(Spec.INITIAL_DISTANCE) }
    val fitDistance = remember { mutableFloatStateOf(Spec.INITIAL_DISTANCE) }
    val viewSize = remember { mutableStateOf(0 to 0) }
    val modelNodeRef = remember { mutableStateOf<ModelNode?>(null) }
    val lastFrameNanos = remember { mutableLongStateOf(0L) }
    // Trenutne (animirane) vrijednosti materijala
    val cur = remember {
        floatArrayOf(
            variant.linear[0], variant.linear[1], variant.linear[2],
            variant.metallic, variant.roughness,
        )
    }

    val elevationRad = Math.toRadians(Spec.ELEVATION_DEG.toDouble())
    val cameraNode = rememberCameraNode(engine) {
        focalLength = Spec.FOCAL_LENGTH_MM
        position = Position(
            x = 0f,
            y = (Spec.INITIAL_DISTANCE * sin(elevationRad)).toFloat(),
            z = (Spec.INITIAL_DISTANCE * cos(elevationRad)).toFloat(),
        )
        lookAt(Position(0f, 0f, 0f))
    }

    /** FitCamera (VIEWER-SPEC poglavlje 3): cijeli model u kadru po visini I širini. */
    fun refitCamera() {
        val instance = modelInstance ?: return
        val (w, h) = viewSize.value
        if (w == 0 || h == 0) return
        val box = instance.model.boundingBox
        val halfH: Float = box.halfExtent[1]
        val rXZ: Float = hypot(box.halfExtent[0], box.halfExtent[2]) // pola XZ dijagonale
        val vTan: Float = tan(Math.toRadians(Spec.FOV_Y_DEG / 2)).toFloat()
        val hTan: Float = vTan * w / h
        val distW: Float = rXZ * (Spec.FIT_WIDTH_MARGIN / hTan + 1f) // fit širine na najbližoj plohi
        val distV: Float = Spec.FIT_HEIGHT_MARGIN * halfH / vTan + Spec.FIT_DEPTH_COMP * rXZ
        val target = maxOf(distV, distW).coerceIn(Spec.ZOOM_MIN, Spec.ZOOM_MAX)
        // korisnički zoom offset se čuva relativno na fit
        val userZoom = distance.floatValue / fitDistance.floatValue
        fitDistance.floatValue = target
        distance.floatValue = (target * userZoom).coerceIn(Spec.ZOOM_MIN, Spec.ZOOM_MAX)
    }

    Box(Modifier.fillMaxSize().background(Spec.background)) {
        SceneView(
            modifier = Modifier
                .fillMaxSize()
                .onSizeChanged {
                    viewSize.value = it.width to it.height
                    refitCamera()
                },
            engine = engine,
            modelLoader = modelLoader,
            cameraNode = cameraNode,
            cameraManipulator = null, // kamera je NAŠA — bez orbit kontrola
            isOpaque = false, // pozadina dolazi iz Compose Boxa (#0c1c13)
            onGestureListener = rememberOnGestureListener(
                onScroll = { _, _, _, delta ->
                    // horizontalni drag → kutna brzina rotacije modela oko Y
                    yawVelocity.floatValue = delta.x * Spec.DRAG_DEG_PER_PX * 60f
                    yawDeg.floatValue -= delta.x * Spec.DRAG_DEG_PER_PX
                    lastInteraction.longValue = System.nanoTime()
                },
                onScale = { detector, _, _ ->
                    distance.floatValue = (distance.floatValue / detector.scaleFactor)
                        .coerceIn(Spec.ZOOM_MIN, Spec.ZOOM_MAX)
                    lastInteraction.longValue = System.nanoTime()
                },
            ),
            onFrame = { frameTimeNanos ->
                val dt = if (lastFrameNanos.longValue == 0L) 0f
                else ((frameTimeNanos - lastFrameNanos.longValue) / 1e9f).coerceAtMost(0.1f)
                lastFrameNanos.longValue = frameTimeNanos

                // 1) rotacija modela: damping inercije + auto-rotate nakon pauze
                val idleS = (frameTimeNanos - lastInteraction.longValue) / 1e9f
                if (lastInteraction.longValue == 0L || idleS > Spec.AUTO_ROTATE_RESUME_MS / 1000f) {
                    yawDeg.floatValue += Spec.AUTO_ROTATE_DEG_PER_S * dt
                } else {
                    yawVelocity.floatValue *= exp(-Spec.DAMPING_RATE * dt)
                    yawDeg.floatValue -= yawVelocity.floatValue * dt
                }
                modelNodeRef.value?.rotation = Rotation(y = yawDeg.floatValue)

                // 2) kamera: fiksni smjer (8° elevacije), mijenja se samo udaljenost
                val d = distance.floatValue
                cameraNode.position = Position(
                    x = 0f,
                    y = (d * sin(elevationRad)).toFloat(),
                    z = (d * cos(elevationRad)).toFloat(),
                )
                cameraNode.lookAt(Position(0f, 0f, 0f))

                // 3) ANIMIRANI prijelaz materijala: k = 1 − e^(−4.5·dt)
                val k = 1f - exp(-Spec.LERP_RATE * dt)
                val t = variant
                cur[0] += (t.linear[0] - cur[0]) * k
                cur[1] += (t.linear[1] - cur[1]) * k
                cur[2] += (t.linear[2] - cur[2]) * k
                cur[3] += (t.metallic - cur[3]) * k
                cur[4] += (t.roughness - cur[4]) * k
                // FilamentInstance.getMaterialInstances() — Java član (Array), ne
                // sceneview ekstenzija (Map): član ima prednost u resoluciji.
                modelInstance?.materialInstances?.forEach { mi ->
                    mi.setParameter("baseColorFactor", cur[0], cur[1], cur[2], 1f)
                    mi.setParameter("metallicFactor", cur[3])
                    mi.setParameter("roughnessFactor", cur[4])
                }
            },
        ) {
            modelInstance?.let { instance ->
                ModelNode(
                    modelInstance = instance,
                    apply = {
                        modelNodeRef.value = this
                        refitCamera() // bbox sada postoji — kadriraj
                    },
                )
            }
        }

        // U fullscreenu (edge-to-edge dialog) kontrole ne smiju pod status bar
        val controlsPadding =
            if (fullscreen) Modifier.statusBarsPadding() else Modifier

        // Swatchevi (gore lijevo) — aktivni: bijeli rub + zlatni prsten
        Row(
            controlsPadding.align(Alignment.TopStart).padding(10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Spec.variants.forEach { v ->
                val active = v.key == variant.key
                Box(
                    Modifier
                        .size(26.dp)
                        .then(
                            if (active) Modifier.border(2.dp, Spec.activeRing, CircleShape)
                            else Modifier
                        )
                        .padding(if (active) 2.dp else 0.dp)
                        .background(v.composeColor, CircleShape)
                        .border(
                            2.dp,
                            if (active) Color.White else Color(0x59FFFFFF),
                            CircleShape,
                        )
                        .clickable { onVariant(v) },
                )
            }
        }

        // Fullscreen gumb (gore desno)
        IconButton(
            onClick = onToggleFullscreen,
            modifier = controlsPadding
                .align(Alignment.TopEnd)
                .padding(10.dp)
                .size(30.dp)
                .background(Spec.buttonBg, RoundedCornerShape(8.dp)),
        ) {
            Icon(
                imageVector = fullscreenIcon(exit = fullscreen),
                contentDescription = if (fullscreen) "Izađi iz punog zaslona" else "Puni zaslon",
                tint = Color.White,
                modifier = Modifier.size(16.dp),
            )
        }

        // Atribucijski caveat (v. modeli/tomislav-bista/README.md)
        Text(
            Spec.ATTRIBUTION,
            color = Color(0x73FFFFFF),
            fontSize = 11.sp,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 10.dp, vertical = 8.dp),
        )
    }
}

/** Ikone punog zaslona (isti path kao web implementacije). */
private fun fullscreenIcon(exit: Boolean): ImageVector =
    ImageVector.Builder(
        name = if (exit) "fs_exit" else "fs",
        defaultWidth = 24.dp, defaultHeight = 24.dp,
        viewportWidth = 24f, viewportHeight = 24f,
    ).apply {
        path(
            stroke = androidx.compose.ui.graphics.SolidColor(Color.White),
            strokeLineWidth = 2f,
        ) {
            if (!exit) {
                moveTo(3f, 8f); verticalLineTo(3f); horizontalLineTo(8f)
                moveTo(16f, 3f); horizontalLineTo(21f); verticalLineTo(8f)
                moveTo(21f, 16f); verticalLineTo(21f); horizontalLineTo(16f)
                moveTo(8f, 21f); horizontalLineTo(3f); verticalLineTo(16f)
            } else {
                moveTo(8f, 3f); verticalLineTo(8f); horizontalLineTo(3f)
                moveTo(21f, 8f); horizontalLineTo(16f); verticalLineTo(3f)
                moveTo(16f, 21f); verticalLineTo(16f); horizontalLineTo(21f)
                moveTo(3f, 16f); horizontalLineTo(8f); verticalLineTo(21f)
            }
        }
    }.build()
