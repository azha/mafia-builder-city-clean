#!/usr/bin/env python3
"""m17 - tuile 1 : lignes de texte, paddings, interligne. Bornes de tuile prises
de m13 (liserés). Encre = luminance > fond+18 (texte clair sur fond de tuile).
Controle positif : la ligne 1 ('col ouvert') doit avoir la meme hauteur de
capitale des 2 cotes (r10 C11 : largeurs d'encre a <=1,3 %).
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
JEU=[(517,608),(626,716),(731,823),(839,930)]
REF=[(548,648),(663,763),(779,878),(894,994)]
CAD={'ref':('reference-1080x2102.png',21,452,REF),'jeu':('capture-1080x2400.png',18,482,JEU)}
for nom in ('ref','jeu'):
    f,X0,Y0,T=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    for i,(a,c) in enumerate(T):
        fondt=statistics.median([lum(px[X0+x,Y0+y]) for y in range(a+8,c-6) for x in range(600,990,3)])
        tr=[y for y in range(a+2,c-1)
            if sum(1 for x in range(600,990) if lum(px[X0+x,Y0+y])>fondt+18)>=3]
        bb=[]
        if tr:
            d=tr[0]; p=tr[0]
            for y in tr[1:]:
                if y-p>3: bb.append((d,p)); d=y
                p=y
            bb.append((d,p))
        l1=bb[0] if bb else None
        print(f'  tuile{i+1} local {a}..{c} h={c-a+1} fond={fondt:.1f} lignes={bb}')
        if len(bb)>=2:
            print(f'     padding haut {bb[0][0]-a} · interligne {bb[1][0]-bb[0][0]} · padding bas {c-bb[-1][1]}')
