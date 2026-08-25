# -*- coding: utf-8 -*-
"""Metrique typographique: bbox d'encre, hauteur de capitale, couleur d'encre."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')

def encre(im, x0,y0,x1,y1, tag, ech, marge=30):
    px=im.load()
    Ls=sorted(lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1))
    bg=Ls[len(Ls)//4]           # quartile bas = fond
    seuil=bg+marge
    xs=[];ys=[];cols=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if lum(c)>seuil: xs.append(x); ys.append(y); cols.append(c)
    if not xs: print(f"  [{tag}] pas d'encre (bg L={bg:.1f})"); return None
    # couleur d'encre = mediane des 20% les plus lumineux
    cols.sort(key=lum); top=cols[int(len(cols)*0.8):]
    tr=sorted(c[0] for c in top); tg=sorted(c[1] for c in top); tb=sorted(c[2] for c in top)
    ink=(tr[len(tr)//2], tg[len(tg)//2], tb[len(tb)//2])
    h=max(ys)-min(ys)+1; w=max(xs)-min(xs)+1
    bgc=med(im,x0,y0,x1,y1)
    print(f"  [{tag}] bbox x {min(xs)}..{max(xs)} (l={w} = {w/ech:.1f} CSS)  y {min(ys)}..{max(ys)} (h={h} = {h/ech:.2f} CSS)")
    print(f"          encre={ink}  fond median={bgc}  contraste={contraste(ink,bgc):.2f}:1  (fond L quartile={bg:.1f}, seuil={seuil:.1f})")
    return dict(x0=min(xs),x1=max(xs),y0=min(ys),y1=max(ys),w=w,h=h,ink=ink,bg=bgc)

EK=3.0; EC=1080/392.0
print("\n########## CANON (3.000 px/CSS) ##########")
encre(K, 45,22,205,58,  'canon ARGENT (libelle)', EK)
encre(K, 40,58,250,112, 'canon $ 24 850 (valeur)', EK)
encre(K, 800,38,1150,68,'canon JOUR 12 . SOIREE', EK)
encre(K, 995,66,1150,115,'canon 21:40', EK)

print("\n########## CAPTURE 1080x1920 (2.755 px/CSS) ##########")
encre(C, 190,18,330,52,  'c19 ARGENT (libelle)', EC)
encre(C, 190,55,405,102, 'c19 $10,000.00 (valeur)', EC)
encre(C, 895,18,1020,52, 'c19 JOUR 1', EC)
encre(C, 875,55,1020,105,'c19 Dawn', EC)
encre(C, 100,55,145,85,  'c19 fleche retour', EC)
