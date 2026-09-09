# m2 — extension de la FEUILLE (encre, bord a bord) sur la capture + fond de feuille.
# Controle positif : sur la REFERENCE, le meme detecteur doit rendre 0..1119 (la ref EST la feuille).
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap = Image.open(os.path.join(D, "capture-1080x2400.png")).convert("RGB")
ref = Image.open(os.path.join(D, "reference-1120.png")).convert("RGB")
print("capture", cap.size, "reference", ref.size)
c = cap.load(); r = ref.load()

# echantillons de couleur, capture
print("\n-- echantillons capture --")
for (x,y,lbl) in [(5,1200,"marge gauche"),(1074,1200,"marge droite"),(540,1900,"centre bas feuille"),
                  (30,1200,"interieur gauche"),(1050,1200,"interieur droit"),(540,205,"au dessus feuille"),
                  (540,2170,"sous feuille"),(540,240,"haut feuille"),(540,2140,"bas feuille")]:
    print(lbl,(x,y),c[x,y])

def med(px,x0,y0,x1,y1):
    vals=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): vals[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in vals)

print("\nfond feuille capture (mediane 540..600 x 1980..2040):", med(c,540,1980,600,2040))
print("fond feuille reference (mediane 540..600 x 1780..1830):", med(r,540,1780,600,1830))

# detection horizontale : sur une ligne de fond pur, ou commence/finit la feuille ?
def bornes_x(px, y, W):
    fond = med(px, W//2-30, y-5, W//2+30, y+5)
    xs=[]
    for x in range(W):
        p=px[x,y]
        if abs(p[0]-fond[0])<=4 and abs(p[1]-fond[1])<=4 and abs(p[2]-fond[2])<=4:
            xs.append(x)
    return (min(xs), max(xs), fond) if xs else (None,None,fond)

for y in [1900,1950,2000,2050,2100]:
    print("capture y=%d bornes feuille"%y, bornes_x(c,y,1080))
print("reference y=1800 bornes", bornes_x(r,1800,1120))

# detection verticale sur une colonne de fond
def bornes_y(px, x, H, y0, y1):
    fond = med(px, x-5, (y0+y1)//2-20, x+5, (y0+y1)//2+20)
    ys=[y for y in range(y0,y1) if all(abs(px[x,y][i]-fond[i])<=4 for i in range(3))]
    return (min(ys),max(ys),fond) if ys else (None,None,fond)
print("capture colonne x=540 bornes verticales feuille", bornes_y(c,540,2400,0,2400))
print("capture colonne x=30  bornes verticales feuille", bornes_y(c,30,2400,0,2400))
