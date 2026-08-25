# -*- coding: utf-8 -*-
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
EK=3.0; EC=1080/392.0
def bbox_rond(im,cx,y0,y1,tag,ech,mode):
    """mode 'sombre' = le rond est plus sombre que le fond ; 'clair' = l'inverse"""
    px=im.load()
    base=lum(med(im,cx-120,y0,cx-90,y1))
    ys=[]
    for y in range(y0,y1):
        L=lum(px[cx,y]); d = (L<base-10) if mode=='sombre' else (L>base+10)
        if d: ys.append(y)
    if not ys: print(f"  [{tag}] rien"); return None
    print(f"  [{tag}] colonne x={cx} : rond y {min(ys)}..{max(ys)} h={max(ys)-min(ys)+1}px = {(max(ys)-min(ys)+1)/ech:.1f} CSS (fond L={base:.1f})")
    return min(ys),max(ys)
print("### extension verticale des ronds ###")
bbox_rond(C,276,1700,1900,'c19 rond 1',EC,'sombre')
bbox_rond(C2,276,2180,2380,'c24 rond 1',EC,'sombre')
print("  canon: rond sombre sur fond dock, colonne x=281")
bbox_rond(K,281,1820,2000,'canon rond 1',EK,'sombre')

def encre(im,x0,y0,x1,y1,tag,ech,S):
    px=im.load(); xs=[];ys=[];cols=[];fonds=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            (cols if lum(c)>S else fonds).append(c)
            if lum(c)>S: xs.append(x);ys.append(y)
    if not xs: print(f"  [{tag}] rien > L={S}"); return
    cols.sort(key=lum); top=cols[int(len(cols)*.8):]
    ink=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
    fonds.sort(key=lum); fond=fonds[len(fonds)//2]
    h=max(ys)-min(ys)+1; w=max(xs)-min(xs)+1
    print(f"  [{tag}] h={h}px={h/ech:.2f}CSS l={w}px={w/ech:.1f}CSS y {min(ys)}..{max(ys)} | encre={ink} fond={fond} CONTRASTE={contraste(ink,fond):.2f}:1")
print("\n### libelles du dock ###")
encre(K,410,2005,560,2040,'canon FAMILLE',EK,80)
encre(K,200,2005,360,2040,'canon EMPIRE',EK,80)
encre(C,215,1835,345,1885,'c19 ACCUEIL',EC,110)
encre(C,385,1835,520,1885,'c19 FAMILLE',EC,110)
encre(C,560,1835,700,1885,'c19 FILIERE',EC,110)
encre(C,735,1835,875,1885,'c19 PLUS',EC,110)
encre(C2,215,2310,345,2365,'c24 ACCUEIL',EC,110)
encre(C2,385,2310,520,2365,'c24 FAMILLE',EC,110)
print("\n### ronds : remplissage / bordure / fond ###")
def M(im,x0,y0,x1,y1,t):
    c=med(im,x0,y0,x1,y1); print(f"    {t:46s} {c} L={lum(c):6.1f}"); return c
M(K,255,1900,310,1935,'canon interieur rond 1')
M(K,214,1905,217,1930,'canon bordure gauche rond 1')
M(K,150,1900,200,1935,'canon fond dock a cote')
M(C,255,1755,300,1790,'c19 interieur rond 1')
M(C,230,1760,234,1785,'c19 bordure gauche rond 1')
M(C,150,1755,215,1790,'c19 fond a cote (teal)')
M(C2,255,2235,300,2270,'c24 interieur rond 1')
M(C2,230,2240,234,2265,'c24 bordure gauche rond 1')
M(C2,150,2235,215,2270,'c24 fond a cote')
print("\n### indicateur actif + pastille FAMILLE ###")
def est_or(c):
    r,g,b=c; return r>110 and r-b>45 and g>75
def orzone(im,x0,y0,x1,y1,tag,ech):
    px=im.load(); pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if est_or(px[x,y])]
    if not pts: print(f"  [{tag}] AUCUN pixel laiton"); return
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f"  [{tag}] {len(pts)}px x {min(xs)}..{max(xs)} (l={(max(xs)-min(xs)+1)/ech:.1f}CSS) y {min(ys)}..{max(ys)} (h={(max(ys)-min(ys)+1)/ech:.1f}CSS)")
orzone(K,200,1985,360,2005,'canon pointe active (EMPIRE)',EK)
orzone(K,400,1840,570,1900,'canon pastille or FAMILLE',EK)
orzone(C,215,1820,345,1845,'c19 pointe active (ACCUEIL)',EC)
orzone(C,385,1700,520,1780,'c19 pastille or FAMILLE ?',EC)
orzone(C2,215,2295,345,2325,'c24 pointe active (ACCUEIL)',EC)
orzone(C2,385,2180,520,2260,'c24 pastille or FAMILLE ?',EC)
