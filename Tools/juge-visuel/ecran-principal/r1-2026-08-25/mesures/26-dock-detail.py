# -*- coding: utf-8 -*-
"""Dock: libelles (hauteur, couleur, CONTRASTE sur leur fond reel), ronds (remplissage/bordure), indicateur actif."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
def encre(im,x0,y0,x1,y1,tag,ech,S):
    px=im.load(); xs=[];ys=[];cols=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if lum(c)>S: xs.append(x);ys.append(y);cols.append(c)
    if not xs: print(f"  [{tag}] rien au-dessus de L={S}"); return None
    cols.sort(key=lum); top=cols[int(len(cols)*.8):]
    ink=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
    # fond = mediane des pixels SOUS le seuil
    fonds=[im.load()[x,y] for y in range(y0,y1) for x in range(x0,x1) if lum(im.load()[x,y])<=S]
    fonds.sort(key=lum); fond=fonds[len(fonds)//2]
    h=max(ys)-min(ys)+1; w=max(xs)-min(xs)+1
    print(f"  [{tag}] h={h}px={h/ech:.2f}CSS l={w}px={w/ech:.1f}CSS  y {min(ys)}..{max(ys)} x {min(xs)}..{max(xs)}")
    print(f"        encre={ink}  fond={fond}  CONTRASTE={contraste(ink,fond):.2f}:1")
    return ink,fond
EK=3.0; EC=1080/392.0
print("### libelles du dock ###")
encre(K,150,1990,420,2035,'canon EMPIRE',EK,80)
encre(K,355,1990,620,2035,'canon FAMILLE',EK,80)
encre(C,215,1970,345,2010,'c19 ACCUEIL',EC,110)
encre(C,385,1970,520,2010,'c19 FAMILLE',EC,110)
encre(C,560,1970,700,2010,'c19 FILIERE',EC,110)
encre(C,740,1970,875,2010,'c19 PLUS',EC,110)
encre(C2,215,2320,345,2360,'c24 ACCUEIL',EC,110)
encre(C2,385,2320,520,2360,'c24 FAMILLE',EC,110)

print("\n### remplissage et bordure des ronds ###")
def M(im,x0,y0,x1,y1,t):
    c=med(im,x0,y0,x1,y1); print(f"    {t:46s} {c} L={lum(c):6.1f}"); return c
M(K,250,1900,310,1935,'canon interieur rond 1 (centre)')
M(K,213,1910,217,1925,'canon bordure gauche rond 1')
M(K,150,1900,200,1935,'canon fond du dock a cote du rond')
M(C,255,1790,300,1825,'c19 interieur rond 1 (centre)')
M(C,229,1800,233,1815,'c19 bordure gauche rond 1')
M(C,150,1790,215,1825,'c19 fond a cote du rond')
M(C2,255,2270,300,2305,'c24 interieur rond 1')
M(C2,229,2280,233,2295,'c24 bordure gauche rond 1')
M(C2,150,2270,215,2305,'c24 fond a cote du rond')

print("\n### indicateur ACTIF (trait laiton) et pastille or FAMILLE ###")
def est_or(c):
    r,g,b=c; return r>110 and r-b>45 and g>75
def orzone(im,x0,y0,x1,y1,tag,ech):
    px=im.load(); pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if est_or(px[x,y])]
    if not pts: print(f"  [{tag}] aucun pixel laiton"); return
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f"  [{tag}] {len(pts)}px  x {min(xs)}..{max(xs)} (l={(max(xs)-min(xs)+1)/ech:.1f}CSS)  y {min(ys)}..{max(ys)} (h={(max(ys)-min(ys)+1)/ech:.1f}CSS)")
orzone(K,150,1975,420,2000,'canon pointe active sous EMPIRE',EK)
orzone(K,355,1840,620,1900,'canon pastille or FAMILLE',EK)
orzone(C,215,1930,345,1975,'c19 pointe active sous ACCUEIL',EC)
orzone(C,385,1750,520,1830,'c19 pastille or FAMILLE ?',EC)
orzone(C2,215,2300,345,2330,'c24 pointe active sous ACCUEIL',EC)
