# m4 (v2) — rects des cartes et rayon d'arrondi, fond LOCAL echantillonne sur la meme ligne.
# Controle positif : REFERENCE carte #2 doit rendre x0~50, largeur ~ 274 CSS = 986 px ; rayon 3 CSS ~ 11 px.
# Controle negatif : la meme sonde sur une ligne SANS carte (gouttiere entre deux cartes) doit rendre None.
from PIL import Image
def scan_row(im,y,tol=8,xfond=15):
    px=im.load();W=im.size[0];fond=px[xfond,y];xs=[]
    for x in range(30,W-30):
        p=px[x,y]
        if max(abs(p[i]-fond[i]) for i in range(3))>tol: xs.append(x)
    if not xs: return None,fond
    return (xs[0],xs[-1],xs[-1]-xs[0]+1),fond

def rayon(im,ytop,maxd=30,tol=8):
    best=0;wmax=0;hist=[]
    for d in range(maxd):
        r,_=scan_row(im,ytop+d,tol)
        w=0 if r is None else r[2]
        hist.append(w)
        if w>wmax: wmax=w;best=d
    return best,wmax,hist[:14]

ref=Image.open('reference-1080x2102.png').convert('RGB'); print('ref',ref.size)
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)

print("\n== REFERENCE ==")
for nom,y in [('#1 visee',1165),('#2 Tarcum',1350),('#3 Gorge',1530),('#4 Saltline',1710)]:
    r,f=scan_row(ref,y); print(f"  carte {nom:12s} y={y} -> {r}  (fond local {f})")
print("  CONTROLE NEGATIF gouttiere y=1258 :", scan_row(ref,1258)[0])
print("  rayon carte #2 depuis y=1265 (d,wmax,hist) :", rayon(ref,1265))

print("\n== CAPTURE ==")
for nom,y,yt in [('#1 La Coil',760,664),('#2 Tarcum',950,855),('#3 Gorge',1140,1046),('#4 Saltline',1330,1237)]:
    r,f=scan_row(cap,y); print(f"  carte {nom:12s} y={y} -> {r}  (fond local {f})")
    print(f"    rayon depuis y={yt} (d,wmax,hist) :", rayon(cap,yt))
print("  CONTROLE NEGATIF gouttiere y=845 :", scan_row(cap,845)[0])
