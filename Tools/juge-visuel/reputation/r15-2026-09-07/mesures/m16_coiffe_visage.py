"""m16 — la coiffe et le visage (M7 / m5 du r14).
Peau = pixels proches du jeton creme (216,208,178) a +-26 ; sombre = luminance < 30 dans la carte.
Controle positif : la peau doit former UNE tache unique dans les 3 images.
Controle negatif : le detecteur de peau ne doit rien trouver dans la colonne droite (tuiles).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def proche(c,j,t): return max(abs(c[0]-j[0]),abs(c[1]-j[1]),abs(c[2]-j[2]))<=t
CAS={
 'reference-1080x2102.png': dict(carte=(82,505,877,1532)),
 'capture-1080x2400.png'  : dict(carte=(78,502,903,1560)),
 'capture-1080x1920.png'  : dict(carte=(78,502,671,1327)),
}
for nom,c in CAS.items():
    print("="*74); im=ouvrir(nom); p=im.load()
    x0,x1,y0,y1=c['carte']
    # jeton de peau = couleur la plus frequente parmi les clairs de la carte
    from collections import Counter
    cnt=Counter()
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            col=p[x,y]
            if lum(col)>110: cnt[col]+=1
    jeton,n=cnt.most_common(1)[0]
    print(f"  jeton de PEAU (couleur claire dominante de la carte) = {jeton}  ({n} px)")
    peau=[(x,y) for y in range(y0,y1+1) for x in range(x0,x1+1) if proche(p[x,y],jeton,22)]
    ys=[q[1] for q in peau]; xs=[q[0] for q in peau]
    print(f"  PEAU : x{min(xs)}..{max(xs)} (w={max(xs)-min(xs)+1})  y{min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1})  n={len(peau)}")
    # largeur de peau par rangee -> le visage
    parlig={}
    for x,y in peau: parlig.setdefault(y,[]).append(x)
    yv0=min(ys)
    # hauteur du visage : jusqu'a la rangee ou la largeur chute (cou)
    larg={y:(max(v)-min(v)+1) for y,v in parlig.items()}
    lmax=max(larg.values()); ylmax=[y for y in larg if larg[y]==lmax][0]
    print(f"  largeur MAX de peau = {lmax} px a y={ylmax}")
    # silhouette sombre (cheveux) : pixels sombres au-dessus du visage
    sombre=[(x,y) for y in range(yv0-70, yv0+40) for x in range(x0+4,x1-4) if lum(p[x,y])<26]
    if sombre:
        sx=[q[0] for q in sombre]; sy=[q[1] for q in sombre]
        print(f"  SOMBRE (coiffe) : x{min(sx)}..{max(sx)} (w={max(sx)-min(sx)+1})  y{min(sy)}..{max(sy)}")
    # epaisseur laterale de sombre a differents % de la hauteur du visage
    hv = max(ys)-yv0
    print("  epaisseur laterale de SOMBRE (gauche/droite) au bord de la peau :")
    for pc in (5,10,15,20,30,50):
        y=yv0+int(hv*pc/100)
        if y not in parlig: print(f"    {pc:2d}% (y={y}) : pas de peau"); continue
        xg=min(parlig[y]); xd=max(parlig[y])
        g=0
        while xg-1-g>x0 and lum(p[xg-1-g,y])<32: g+=1
        d=0
        while xd+1+d<x1 and lum(p[xd+1+d,y])<32: d+=1
        print(f"    {pc:2d}% (y={y}) : gauche={g} px  droite={d} px")
    n=sum(1 for y in range(y0+50,y0+150) for x in range(560,900) if proche(p[x,y],jeton,22))
    print(f"  [ctrl negatif] peau dans la colonne droite = {n} (attendu 0)")
