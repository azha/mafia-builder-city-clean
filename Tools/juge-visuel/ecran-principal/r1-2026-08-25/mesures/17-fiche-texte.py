# -*- coding: utf-8 -*-
"""Fiche: titre, sous-titre, stats, libelles — hauteur de capitale, largeur d'encre, couleur, contraste."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def encre(im,x0,y0,x1,y1,tag,ech,marge=45):
    px=im.load()
    Ls=sorted(lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1))
    bg=Ls[len(Ls)//4]; seuil=bg+marge
    xs=[];ys=[];cols=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if lum(c)>seuil: xs.append(x);ys.append(y);cols.append(c)
    if not xs: print(f"  [{tag}] rien"); return None
    cols.sort(key=lum); top=cols[int(len(cols)*.8):]
    ink=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
    fond=med(im,x0,y0,x1,y1)
    h=max(ys)-min(ys)+1; w=max(xs)-min(xs)+1
    print(f"  [{tag}] h={h}px={h/ech:.2f}CSS l={w}px={w/ech:.1f}CSS  y {min(ys)}..{max(ys)} x {min(xs)}..{max(xs)}")
    print(f"       encre={ink} fond={fond} contraste={contraste(ink,fond):.2f}:1")
    return dict(h=h/ech,w=w/ech,cx=(min(xs)+max(xs))/2/ech, ink=ink, fond=fond, y0=min(ys), y1=max(ys))
EK=3.0; EC=1080/392.0
print("\n######## CANON — fiche x39..1136 y1277..1783 ########")
encre(K,300,1320,880,1385,'canon TITRE  LE VERGE D OR ',EK,60)
encre(K,300,1395,880,1440,'canon sous-titre BAR . QG',EK,40)
encre(K,60,1475,400,1530,'canon stat1 valeur  $ 2 400 ',EK,50)
encre(K,420,1475,760,1530,'canon stat2 valeur  $ 180/h ',EK,50)
encre(K,780,1475,1110,1530,'canon stat3 valeur  12% ',EK,50)
encre(K,60,1540,400,1580,'canon stat1 libelle  A COLLECTER ',EK,35)
encre(K,420,1540,760,1580,'canon stat2 libelle  REVENUS ',EK,35)
encre(K,780,1540,1110,1580,'canon stat3 libelle  HEAT LOCAL ',EK,35)
print("\n######## CAPTURE — fiche x33..1046 y1188..1653 ########")
encre(C,300,1222,780,1275,'c19 TITRE  Lab ',EC,60)
encre(C,300,1280,780,1315,'c19 sous-titre  OPERATIONNEL ',EC,40)
encre(C,55,1340,400,1395,'c19 stat1 valeur  Au repos ',EC,50)
encre(C,420,1340,700,1395,'c19 stat2 valeur  Coupee ',EC,50)
encre(C,720,1340,1030,1395,'c19 stat3 valeur  Sain ',EC,50)
encre(C,55,1398,400,1430,'c19 stat1 libelle  REVENU ',EC,35)
encre(C,420,1398,700,1430,'c19 stat2 libelle  CHAINE ',EC,35)
encre(C,720,1398,1030,1430,'c19 stat3 libelle  ETAT ',EC,35)
