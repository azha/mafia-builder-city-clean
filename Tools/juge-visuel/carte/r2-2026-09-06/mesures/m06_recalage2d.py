# m06 — RECALAGE 2-D par recherche sur (s, tx, ty), cout = mediane des |diff| sur des points a FORT GRADIENT.
# Le profil de colonnes du m05 ne discriminait pas en X (5,29 contre 5,60 a +-20 px) : j'en change.
# Controle positif  : le cout au minimum doit etre << au cout a +-15 px (sinon l'instrument ne mesure rien).
# Controle negatif  : je teste aussi l'ANISOTROPIE (sx != sy) et je regarde si elle ameliore.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref = Image.open(os.path.join(D, "reference-1080x2102.png")).convert("L")
cap = Image.open(os.path.join(D, "capture-1080x2400.png")).convert("L")
print("OUVERT ref", ref.size, "cap", cap.size)
RP = ref.load(); CP = cap.load()
W = 1080

# points d'interet : fort gradient dans la reference, hors des zones de marqueur/ecusson
pts = []
for y in range(240, 2060, 5):
    for x in range(30, 1050, 5):
        g = abs(RP[x+2,y]-RP[x-2,y]) + abs(RP[x,y+2]-RP[x,y-2])
        if g > 40:
            pts.append((x, y, RP[x,y]))
print("points a fort gradient :", len(pts))
step = max(1, len(pts)//4000)
pts = pts[::step]
print("points retenus :", len(pts))

def cost(sx, sy, tx, ty):
    ds = []
    for x, y, v in pts:
        cx = sx*x + tx; cy = sy*y + ty
        ix = int(cx); iy = int(cy)
        if 0 <= ix < 1079 and 0 <= iy < 2399:
            fx = cx-ix; fy = cy-iy
            a = CP[ix,iy]*(1-fx) + CP[ix+1,iy]*fx
            b = CP[ix,iy+1]*(1-fx) + CP[ix+1,iy+1]*fx
            ds.append(abs(v - (a*(1-fy) + b*fy)))
    ds.sort()
    return ds[len(ds)//2], len(ds)

best = None
s = 0.995
while s <= 1.055:
    tx = -25.0
    while tx <= 25.0:
        ty = -20.0
        while ty <= 45.0:
            c, n = cost(s, s, tx, ty)
            if best is None or c < best[0]: best = (c, s, tx, ty)
            ty += 5
        tx += 5
    s += 0.005
print(f"grossier : s={best[1]:.4f} tx={best[2]:.1f} ty={best[3]:.1f} cout={best[0]:.3f}")

c0, s0, tx0, ty0 = best
best = None
s = s0-0.006
while s <= s0+0.006:
    tx = tx0-6
    while tx <= tx0+6:
        ty = ty0-6
        while ty <= ty0+6:
            c, n = cost(s, s, tx, ty)
            if best is None or c < best[0]: best = (c, s, tx, ty)
            ty += 1
        tx += 1
    s += 0.001
c, S, TX, TY = best
print(f"fin ISO  : s={S:.4f} tx={TX:.1f} ty={TY:.1f} cout={c:.4f}")
print("CTRL discrimination (isotrope) :")
for d in (-15,-8,-3,0,3,8,15):
    print(f"   tx{d:+3d} -> {cost(S,S,TX+d,TY)[0]:.4f}    ty{d:+3d} -> {cost(S,S,TX,TY+d)[0]:.4f}")

# --- controle d'anisotropie : sx libre autour de S
print("CTRL anisotropie (sy fige, sx balaye, tx re-optimise) :")
for sx in [S-0.03, S-0.02, S-0.01, S-0.005, S, S+0.005, S+0.01, S+0.02]:
    bb = None
    for txd in range(-25, 26):
        c2, _ = cost(sx, S, TX+txd, TY)
        if bb is None or c2 < bb[0]: bb = (c2, TX+txd)
    print(f"   sx={sx:.4f} (sx/sy={sx/S:.4f})  meilleur tx={bb[1]:.0f}  cout={bb[0]:.4f}")
print()
print(f"=> RECALAGE RETENU : cap = {S:.4f} * ref + ({TX:.1f}, {TY:.1f})")
print(f"   peinture visible : ref_x {(0-TX)/S:.1f}..{(1079-TX)/S:.1f}   ref_y {(232-TY)/S:.1f}..{(2135-TY)/S:.1f}")
