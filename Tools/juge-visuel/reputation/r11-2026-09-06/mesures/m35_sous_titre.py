#!/usr/bin/env python3
"""m35 - sous-titre de l'enseigne : couleur de coeur, hauteur de capitale,
largeur d'encre. Coeur = px dont la luminance est dans les 3 % les plus clairs.
Controle positif : la largeur d'encre de la ligne 2 ('ABSORBE') doit etre
comparable des deux cotes."""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom,f,X0,Y0,ya,yb in [('ref','reference-1080x2102.png',21,452,130,185),
                          ('jeu','capture-1080x2400.png',18,482,136,190)]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size} fenetre locale y{ya}..{yb}')
    vals=[(lum(px[X0+x,Y0+y]),px[X0+x,Y0+y],x,y) for y in range(ya,yb) for x in range(100,960)]
    vals.sort(key=lambda t:-t[0])
    top=vals[:max(1,len(vals)//33)]
    print(f'  px les plus clairs : max {top[0][1]} · mediane des 3 % {tuple(int(statistics.median([t[1][i] for t in top])) for i in range(3))}')
    seuil=90
    enc=[(x,y) for l,p,x,y in vals if l>seuil]
    if enc:
        xs=[e[0] for e in enc]; ys=[e[1] for e in enc]
        rows=sorted(set(ys)); b=[];d=rows[0];p=rows[0]
        for v in rows[1:]:
            if v-p>2: b.append((d,p)); d=v
            p=v
        b.append((d,p))
        print(f'  bandes (lum>{seuil}) : {b}')
        for g in b:
            sub=[e for e in enc if g[0]<=e[1]<=g[1]]
            sx=[e[0] for e in sub]
            print(f'    y {g[0]}..{g[1]} h={g[1]-g[0]+1} · x {min(sx)}..{max(sx)} l={max(sx)-min(sx)+1} · n={len(sub)}')
