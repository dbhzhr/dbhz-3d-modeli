# Ispravljanje nagiba 3D scana: dno postolja (najveća planarna ploha) mora
# gledati točno prema dolje (-Y). Scan je nagnut, pa "najveći raspon = vertikala"
# heuristika iz stl2glb.py nije dovoljna — ovdje poravnavamo geometrijski.
import numpy as np
import trimesh

SRC = "/Users/ms/Downloads/Kralj Tomislav - Bista final_300k.stl"
OUT = "public/models/tomislav-bista.glb"

m = trimesh.load(SRC, force="mesh")
print("loaded:", len(m.vertices), "verts,", len(m.faces), "faces")

# Decimacija za web (isto kao originalni pipeline)
target = 80000
if len(m.faces) > target:
    m = m.simplify_quadric_decimation(face_count=target)
    print("decimated to", len(m.faces), "faces")

# 1) Grupiraj normale lica u stošce od ~2°, pa unutar svake grupe subklasteriraj
#    po offsetu ravnine (d = n·težište lica) — koplanarni klaster = stvarna ploha.
#    Ravno dno postolja = najveći koplanarni klaster koji je ujedno na rubu modela.
normals = m.face_normals
areas = m.area_faces
centroids = m.triangles_center
diag = float(np.linalg.norm(m.extents))
gap = 0.004 * diag  # prekid u offsetu veći od ovoga = druga ravnina

uniq, groups = trimesh.grouping.group_vectors(normals, angle=np.radians(2.0))
group_area = np.array([areas[g].sum() for g in groups])
order = np.argsort(group_area)[::-1]

candidates = []  # (area, n, faces)
for i in order[:40]:
    n = uniq[i]
    g = np.asarray(groups[i])
    d = centroids[g] @ n
    srt = np.argsort(d)
    g, d = g[srt], d[srt]
    splits = np.where(np.diff(d) > gap)[0] + 1
    for cluster in np.split(np.arange(len(g)), splits):
        faces = g[cluster]
        candidates.append((areas[faces].sum(), n, faces))

candidates.sort(key=lambda c: -c[0])
proj_all_cache = {}
n_base = None
for area, n, faces in candidates[:15]:
    key = tuple(n.round(5))
    if key not in proj_all_cache:
        proj_all_cache[key] = m.vertices @ n
    proj_all = proj_all_cache[key]
    verts = np.unique(m.faces[faces])
    proj = m.vertices[verts] @ n
    extent = proj_all.max() - proj_all.min()
    spread = proj.max() - proj.min()
    edge = proj_all.max() - proj.mean()  # normala gleda van → ploha na max strani
    print(f"  kandidat: area {area:9.2f}  n {n.round(3)}  spread {100*spread/extent:5.2f}%  rub {100*edge/extent:5.2f}%")
    if n_base is None and spread / extent < 0.03 and edge / extent < 0.03:
        n_base = n
        base_area = area

assert n_base is not None, "nije nađena koplanarna rubna ploha (dno)"
print(f"DNO: normala {n_base.round(4)}, area {base_area:.2f}")

# 3) Kut nagiba prije ispravka (koliko je scan bio nakrivljen u odnosu na Y-up pretpostavku)
tilt = np.degrees(np.arccos(np.clip(np.dot(n_base, [0, -1, 0]), -1, 1)))
print(f"izmjereni nagib scana: {tilt:.2f}°")

# 4) Rotiraj tako da normala dna gleda točno u -Y
R = trimesh.geometry.align_vectors(n_base, [0, -1, 0])
m.apply_transform(R)

# 5) Centriranje + normalizacija (isto kao originalni pipeline)
m.visual = trimesh.visual.ColorVisuals(m)
m.apply_translation(-m.centroid)
m.apply_scale(2.0 / m.extents.max())
m.merge_vertices()

# provjera nakon rotacije: dno je najniža točka, glava najviša
print("bounds nakon ispravka:", m.bounds.tolist())
m.export(OUT)
print("exported", OUT)
