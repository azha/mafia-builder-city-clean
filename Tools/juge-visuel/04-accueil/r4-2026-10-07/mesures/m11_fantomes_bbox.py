# m11 — bbox exacte des boutons fantomes par la COULEUR de leur bord (~58,63,72).
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def prox(p,c,t=9): return all(abs(p[i]-c[i])<=t for i in range(3))
CAS=[
 ('REF   VOIR LA VENTE', B+"r2-2026-10-07/reference/cadre-4-la-suite.png", 1100,1300),
 ('REF   BLANCHIR',      B+"r2-2026-10-07/reference/cadre-4-la-suite.png", 1380,1540),
 ('J1920 VOIR LA VENTE', B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png", 1070,1240),
 ('J1920 BLANCHIR',      B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png", 1255,1430),
 ('J2400 VOIR LA VENTE', B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png", 1475,1645),
 ('J2400 BLANCHIR',      B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png", 1660,1835),
]
C=(58,63,72)
for nom,ch,ya,yb in CAS:
    im=Image.open(ch).convert('RGB'); px=im.load()
    pts=[(x,y) for y in range(ya,yb) for x in range(600,1045) if prox(px[x,y],C)]
    if not pts: print(f"{nom}: rien"); continue
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    print(f"\n--- {nom} [{ch.split('/')[-1]} {im.size}]  bbox=({x0},{y0})..({x1},{y1}) l={x1-x0+1} h={y1-y0+1}  n={len(pts)}")
    # epaisseur du bord au milieu gauche
    yc=(y0+y1)//2
    ep=[x for x in range(x0-4,x0+12) if prox(px[x,yc],C,20)]
    print(f"   epaisseur bord gauche a y={yc} : {len(ep)} px, RGB {[px[x,yc] for x in range(x0-1,x0+5)]}")
    # rayon : premier x de bord par ligne, du haut
    prof=[]
    for dy in range(0,30):
        l=[x for x in range(x0-4,x0+60) if prox(px[x,y0+dy],C,20)]
        prof.append((dy, (min(l)-x0) if l else None))
    print("   retrait du bord gauche (dy, retrait) :", prof[:24])
