# m07 — carte de RESIDU entre la peinture de la reference et celle de la capture, cellule par cellule.
# Recalage m06 : cap = 1.0220*ref + (-12.0, +8.0)
# Convention couleur : je compare la MEDIANE de chaque cellule (robuste aux points/lumieres),
# et je donne le delta par canal (R,G,B) signe : capture - reference.
# Controle positif : les cellules de FLEUVE (peinture pure, sans marqueur) doivent etre a ~0.
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref = Image.open(os.path.join(D, "reference-1080x2102.png")).convert("RGB")
cap = Image.open(os.path.join(D, "capture-1080x2400.png")).convert("RGB")
print("OUVERT ref", ref.size, "cap", cap.size)
RP = ref.load(); CP = cap.load()
S, TX, TY = 1.0220, -12.0, 8.0
CELL = 30
cells = []
for ry in range(225, 2075, CELL):
    for rx in range(15, 1065, CELL):
        rs = [[],[],[]]; cs = [[],[],[]]
        ok = True
        for dy in range(2, CELL-2, 3):
            for dx in range(2, CELL-2, 3):
                x = rx+dx; y = ry+dy
                cx = int(S*x + TX + 0.5); cy = int(S*y + TY + 0.5)
                if not (0 <= cx < 1080 and 232 <= cy <= 2135): ok = False; break
                a = RP[x,y]; b = CP[cx,cy]
                for k in range(3): rs[k].append(a[k]); cs[k].append(b[k])
            if not ok: break
        if not ok: continue
        mr = [statistics.median(rs[k]) for k in range(3)]
        mc = [statistics.median(cs[k]) for k in range(3)]
        d  = [mc[k]-mr[k] for k in range(3)]
        cells.append((rx, ry, mr, mc, d, max(abs(v) for v in d)))
print("cellules :", len(cells))
mags = sorted(c[5] for c in cells)
print(f"ecart max-canal par cellule : mediane {mags[len(mags)//2]:.1f}  p90 {mags[int(len(mags)*0.9)]:.1f}  p99 {mags[int(len(mags)*0.99)]:.1f}  max {mags[-1]:.1f}")
# controle positif : fleuve (ref y ~1050..1150, x 380..640, hors ponts et hors texte LE THRENNY)
fl = [c for c in cells if 1110 <= c[1] <= 1160 and 700 <= c[0] <= 940]
print("CTRL+ cellules de fleuve :", len(fl))
for c in fl[:6]:
    print(f"   ref({c[0]},{c[1]}) ref={c[2]} cap={c[3]} d={c[4]}")
print("\n--- les 25 cellules les plus ecartees")
for c in sorted(cells, key=lambda c:-c[5])[:25]:
    print(f"   ref({c[0]:4d},{c[1]:4d}) ref={c[2]} cap={c[3]} d={c[4]}")
# --- histogramme spatial : par BANDE de 150 px de haut, l'ecart median R-B (chaleur = plus rouge)
print("\n--- par bande horizontale : ecart median par canal, et le 'plus rouge' median (dR - dB)")
for y0 in range(225, 2075, 150):
    b = [c for c in cells if y0 <= c[1] < y0+150]
    if not b: continue
    dr = statistics.median(c[4][0] for c in b); dg = statistics.median(c[4][1] for c in b); db = statistics.median(c[4][2] for c in b)
    print(f"   ref_y {y0:4d}..{y0+149:4d}  n={len(b):3d}  dR={dr:+6.1f} dG={dg:+6.1f} dB={db:+6.1f}   dR-dB={dr-db:+6.1f}")
