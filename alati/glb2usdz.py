#!/usr/bin/env python3
"""GLB -> USDZ derivat za AR Quick Look / RealityKit (bez Xcode alata).

Model iz ovog repoa nema teksture — USDZ je čista geometrija + PBR preview
surface (bronca default iz VIEWER-SPEC-a). Geometrija se čita trimeshom,
USD se gradi usd-core-om (pip install trimesh usd-core).

Pokretanje:  python3 alati/glb2usdz.py [ulaz.glb] [izlaz.usdz]
Default:     modeli/tomislav-bista/tomislav-bista.glb -> .usdz
"""
import sys
from pathlib import Path

import trimesh
from pxr import Gf, Sdf, Usd, UsdGeom, UsdShade, UsdUtils

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'modeli/tomislav-bista/tomislav-bista.glb'
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else SRC.with_suffix('.usdz')

# bronca default iz VIEWER-SPEC (#b07d44 sRGB -> linear, metallic 0.78, roughness 0.42)
def srgb2lin(b):
    c = b / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

BRONCA = {
    'diffuseColor': Gf.Vec3f(srgb2lin(0xB0), srgb2lin(0x7D), srgb2lin(0x44)),
    'metallic': 0.78,
    'roughness': 0.42,
}

scene = trimesh.load(SRC, force='scene')
mesh = trimesh.util.concatenate(list(scene.geometry.values()))
mesh.merge_vertices()  # glatke normale preko šavova

usda = OUT.with_suffix('.usda')
stage = Usd.Stage.CreateNew(str(usda))
UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
UsdGeom.SetStageMetersPerUnit(stage, 1.0)

root = UsdGeom.Xform.Define(stage, '/Bista')
stage.SetDefaultPrim(root.GetPrim())

geom = UsdGeom.Mesh.Define(stage, '/Bista/geom')
geom.CreatePointsAttr([Gf.Vec3f(*v) for v in mesh.vertices])
geom.CreateFaceVertexCountsAttr([3] * len(mesh.faces))
geom.CreateFaceVertexIndicesAttr(mesh.faces.flatten().tolist())
geom.CreateNormalsAttr([Gf.Vec3f(*n) for n in mesh.vertex_normals])
geom.SetNormalsInterpolation(UsdGeom.Tokens.vertex)
geom.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)
geom.CreateExtentAttr(UsdGeom.PointBased.ComputeExtent(geom.GetPointsAttr().Get()))

mat = UsdShade.Material.Define(stage, '/Bista/mat')
shader = UsdShade.Shader.Define(stage, '/Bista/mat/pbr')
shader.CreateIdAttr('UsdPreviewSurface')
shader.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).Set(BRONCA['diffuseColor'])
shader.CreateInput('metallic', Sdf.ValueTypeNames.Float).Set(BRONCA['metallic'])
shader.CreateInput('roughness', Sdf.ValueTypeNames.Float).Set(BRONCA['roughness'])
mat.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), 'surface')
UsdShade.MaterialBindingAPI.Apply(geom.GetPrim()).Bind(mat)

stage.GetRootLayer().Save()
ok = UsdUtils.CreateNewUsdzPackage(str(usda), str(OUT))
usda.unlink()
print(f'{"OK" if ok else "GREŠKA"} — {OUT} ({OUT.stat().st_size/1024/1024:.2f} MB, '
      f'{len(mesh.faces)} trokuta)')
