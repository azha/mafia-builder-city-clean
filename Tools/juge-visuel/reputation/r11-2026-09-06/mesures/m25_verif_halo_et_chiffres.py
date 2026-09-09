#!/usr/bin/env python3
"""m25 - (a) controle du detecteur de halo : combien de px a chaque distance ?
(b) geometrie des chiffres '00' du compteur 1 : bbox, hauteur de capitale,
epaisseur de trait (convention : NOMINALE mi-alpha), et couleur au coeur.
Controle positif : la meme mesure doit rendre le meme nb de px a d=1..3 des
deux cotes (la frange existe partout)."""
from PIL import Image
import os, statistics
from collections import deque
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CYAN=(127,212,217)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
CAD={'ref':('reference-1080x2102.png',21,452,250,363),
     'jeu':('capture-1080x2400.png',18,482,245,359)}
for nom in ('ref','jeu'):
    f,X0,Y0,ya,yb=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    W=[(x,y) for y in range(ya+4,yb-4) for x in range(40,330)]
    setW=set(W)
    encre={p for p in W if L1(px[X0+p[0],Y0+p[1]],CYAN)<=60}
    dist={p:0 for p in encre}; fr=deque(encre)
    while fr:
        p=fr.popleft()
        if dist[p]>=16: continue
        for dx in(-1,0,1):
            for dy in(-1,0,1):
                q=(p[0]+dx,p[1]+dy)
                if q in setW and q not in dist: dist[q]=dist[p]+1; fr.append(q)
    cnt={}
    for p,d in dist.items(): cnt[d]=cnt.get(d,0)+1
    print('  nb de px par distance :', {d:cnt[d] for d in sorted(cnt) if d<=14})
    ex=[(x,y) for (x,y),d in dist.items() if d==6]
    if ex:
        vals=[lum(px[X0+x,Y0+y]) for x,y in ex]
        print(f'  a d=6 : n={len(ex)} lum min {min(vals):.1f} max {max(vals):.1f} moy {statistics.mean(vals):.2f}')
    xs=[p[0] for p in encre]; ys=[p[1] for p in encre]
    print(f'  chiffres 00 : bbox x {min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1}) '
          f'y {min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1})')
    # coeur : pixels a distance >=3 de tout non-encre
    coeur=[px[X0+x,Y0+y] for x,y in encre]
    med=tuple(int(statistics.median([c[i] for c in coeur])) for i in range(3))
    print(f'  couleur mediane de l encre : {med}')
    # epaisseur de trait : longueur du plus long run horizontal a mi-hauteur
    ymid=(min(ys)+max(ys))//2
    runs=[]; cur=0
    for x in range(min(xs),max(xs)+1):
        if (x,ymid) in encre: cur+=1
        else:
            if cur: runs.append(cur); cur=0
    if cur: runs.append(cur)
    print(f'  runs horizontaux a mi-hauteur (y={ymid}) : {runs}')
