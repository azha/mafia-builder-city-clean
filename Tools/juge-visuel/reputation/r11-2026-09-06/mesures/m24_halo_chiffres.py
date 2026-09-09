#!/usr/bin/env python3
"""m24 - F5 : lueur (halo) autour des chiffres cyan des compteurs.
Profil de luminance sur un ANNEAU autour de l'encre cyan du 1er compteur :
pour d = 1..14 px, moyenne de la luminance des pixels a distance de Chebyshev d
de l'encre cyan (encre = L1 a (127,212,217) <= 60), moins la luminance du fond
de la boite (mediane des px a distance > 20).
Controle positif : a d=1 la valeur doit etre elevee des DEUX cotes (frange
d'anti-crenelage) ; controle negatif : a d=14 elle doit tendre vers 0 en ref.
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CYAN=(127,212,217)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
# boite du compteur 1 (local) : ref y 250..363 ; jeu y 245..359 ; x local ~28..335
CAD={'ref':('reference-1080x2102.png',21,452,250,363),
     'jeu':('capture-1080x2400.png',18,482,245,359)}
for nom in ('ref','jeu'):
    f,X0,Y0,ya,yb=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size} boite compteur1 local y{ya}..{yb}')
    W=[(x,y) for y in range(ya+4,yb-4) for x in range(40,330)]
    encre={(x,y) for x,y in W if L1(px[X0+x,Y0+y],CYAN)<=60}
    print(f'  px d encre cyan : {len(encre)}')
    if not encre: continue
    # distance de Chebyshev par dilatation successive
    from collections import deque
    dist={p:0 for p in encre}
    frontier=deque(encre)
    setW=set(W)
    while frontier:
        p=frontier.popleft()
        if dist[p]>=16: continue
        for dx in(-1,0,1):
            for dy in(-1,0,1):
                q=(p[0]+dx,p[1]+dy)
                if q in setW and q not in dist:
                    dist[q]=dist[p]+1; frontier.append(q)
    loin=[lum(px[X0+x,Y0+y]) for (x,y),d in dist.items() if d>20]
    tous=[lum(px[X0+x,Y0+y]) for (x,y) in setW if (x,y) not in dist]
    fond=statistics.median(tous) if tous else 0
    print(f'  fond de boite (px hors atteinte) : lum {fond:.2f}  (n={len(tous)})')
    ligne=[]
    for d in range(1,15):
        vals=[lum(px[X0+x,Y0+y]) for (x,y),dd in dist.items() if dd==d]
        if vals: ligne.append(f'{d}:{statistics.mean(vals)-fond:+.2f}')
    print('  exces de luminance par distance a l encre :', ' '.join(ligne))
