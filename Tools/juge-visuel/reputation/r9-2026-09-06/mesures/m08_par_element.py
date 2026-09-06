# -*- coding: utf-8 -*-
"""m08 — mesure par ELEMENT : bbox d'encre + couleur mediane de l'encre, sur des fenetres
posees a partir des reperes de m01/m03/m07 (jamais devinees).
Contrôle positif  : 'fen b' (chiffres) doit rendre h identique des deux cotes (41 px, m07).
Contrôle négatif  : une fenetre vide rend None (verifie ci-dessous).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def mesure(im,box,seuil):
    px=im.load();x0,y0,x1,y1=box;pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if lum(c)>=seuil: pts.append((x,y,c))
    if not pts: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    # couleur = mediane des 15% les plus lumineux (coeur du glyphe, hors frange)
    pts.sort(key=lambda p:-lum(p[2])); top=pts[:max(1,len(pts)//7)]
    med=tuple(sorted(t[2][k] for t in top)[len(top)//2] for k in range(3))
    return dict(x0=min(xs),x1=max(xs),y0=min(ys),y1=max(ys),w=max(xs)-min(xs)+1,h=max(ys)-min(ys)+1,n=len(pts),col=med)
def duo(nom,bR,bC,sR=95,sC=95):
    a=mesure(R,bR,sR); b=mesure(C,bC,sC)
    if not a or not b:
        print('%-30s REF=%s CAP=%s'%(nom,a,b)); return
    print('%-30s h REF %3d (%5.2fCSS) / CAP %3d (%5.2fCSS)  %+6.1f%%   w REF %4d / CAP %4d  %+6.1f%%   col REF %s / CAP %s'
          %(nom,a['h'],a['h']/3.6,b['h'],b['h']/3.6,100*(b['h']-a['h'])/a['h'],a['w'],b['w'],100*(b['w']-a['w'])/a['w'],a['col'],b['col']))
print('contrôle négatif :',mesure(R,(600,1460,900,1490),95),mesure(C,(600,1220,900,1250),95))
print()
# labels de compteurs, un par un (fenetres larges, bornees par les .fen)
duo('fen span 1 REGLES DONNEES',(56,780,360,802),(50,570,365,596),70,70)
duo('fen span 2 ABSORBEES',      (380,780,690,802),(375,570,690,596),70,70)
duo('fen span 3 ENFREINTES',     (700,780,1020,802),(700,570,1025,596),70,70)
# valeurs de compteurs, une par une
duo('fen b 1 "00"',(56,715,360,775),(50,505,365,565),95,95)
duo('fen b 2 "02/4"',(380,715,690,775),(375,505,690,565),95,95)
duo('fen b 3 "00" / "—"',(700,715,1020,775),(700,505,1025,565),95,95)
