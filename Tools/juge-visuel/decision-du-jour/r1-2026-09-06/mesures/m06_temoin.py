#!/usr/bin/env python3
"""m06 - QUEL cadre est la reference ? On redimensionne reference-1080x2102 a 900x1752 et on la
compare aux 5 etats v4-4..v4-8. Le bon temoin est celui de distance minimale.
Controle : la distance au bon cadre doit etre << a celle des autres.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
print(f"[REF] reference-1080x2102.png {ref.size[0]}x{ref.size[1]}")
r = ref.resize((900,1752), Image.LANCZOS)
for n in range(4,9):
    fn = f'etats/v4-{n}.png'
    im = Image.open(os.path.join(D,fn)).convert('RGB')
    print(f"   [{fn}] {im.size[0]}x{im.size[1]}", end='  ')
    if im.size != (900,1752):
        print("taille inattendue"); continue
    a=r.load(); b=im.load()
    tot=0.0; n2=0
    for y in range(0,1752,4):
        for x in range(0,900,4):
            pa=a[x,y]; pb=b[x,y]
            tot += abs(pa[0]-pb[0])+abs(pa[1]-pb[1])+abs(pa[2]-pb[2]); n2+=1
    print(f"distance moyenne (somme |dRGB|) = {tot/n2:7.2f}")
