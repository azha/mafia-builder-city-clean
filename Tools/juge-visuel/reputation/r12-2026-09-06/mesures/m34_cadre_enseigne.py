import sys; sys.path.insert(0,'.')
from lib import *
print("=== m34 : filet du cadre, marges, bloc enseigne, zone libre ===")
CAS=[('REF','../reference-1080x2102.png',452,2078,1200),
     ('C2400','../capture-1080x2400.png',482,2109,1400),
     ('C1920','../capture-1080x1920.png',250,1629,1000)]
for nom,f,ct,cb,ym in CAS:
    im=ouvrir(f); p=px(im); W,H=im.size
    g=[x for x in range(0,80) if est_or(p[x,ym])]
    d=[x for x in range(W-80,W) if est_or(p[x,ym])]
    print(f"  {nom} : rail gauche x{g[0]}..{g[-1]} (ep={len(g)}) ; rail droit x{d[0]}..{d[-1]} (ep={len(d)}) ;"
          f" hors-tout {d[-1]-g[0]+1} px ; marge ecran G={g[0]} D={W-1-d[-1]}")
    # filet haut/bas du cadre
    xm=W//2
    h=[y for y in range(ct-4,ct+8) if est_or(p[xm,y])]
    b=[y for y in range(cb-8,cb+4) if est_or(p[xm,y])]
    print(f"        filet haut ep={len(h)} ({h[0]}..{h[-1]}) ; filet bas ep={len(b)} ({b[0]}..{b[-1]}) ; hauteur {cb-ct+1}")
print()
print("=== bloc enseigne (panneau + filet or) ===")
for nom,f,ct in [('REF','../reference-1080x2102.png',452),('C2400','../capture-1080x2400.png',482),('C1920','../capture-1080x1920.png',250)]:
    im=ouvrir(f); p=px(im)
    # panneau de l'enseigne : lisere clair, colonne x=52..70
    prof=[(y, sum(lum(p[x,y]) for x in range(ct+ (0), ct+0))/1) for y in range(0,0)]
    # bornes du filet or plein largeur
    ys=[y for y in range(ct, ct+260) if sum(1 for x in range(60,1020) if est_or(p[x,y]))>800]
    # haut du panneau : premier lisere
    col=[sum(lum(p[x,y]) for x in range(52,74))/22 for y in range(ct,ct+80)]
    top=None
    for i in range(2,len(col)-2):
        if col[i]-min(col[i-2],col[i+2])>8: top=ct+i; break
    print(f"  {nom} : haut du panneau enseigne y={top} (rel {top-ct}) ; filet or y {ys[0]}..{ys[-1]} (rel {ys[0]-ct}..{ys[-1]-ct}, ep={len(ys)})")
    print(f"        hauteur du bloc enseigne (haut du panneau -> haut du filet) = {ys[0]-top} px")
