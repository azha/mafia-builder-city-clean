#!/usr/bin/env python3
"""m03 - haut du DOCK : premiere rangee (du haut vers le bas, sous le cadre) qui
porte de l'encre du dock. Encre = pixel dont la luminance depasse de >8 la
MEDIANE de sa propre rangee (robuste au degrade de fond).
Controle positif : la rangee des libelles EMPIRE/FAMILLE doit sortir avec un
gros compte. Controle negatif : une rangee de la gouttiere vide doit sortir 0.
"""
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

for f,y0 in [('capture-1080x1920.png',1600),('capture-1080x2400.png',2080),('reference-1080x2102.png',1980)]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load(); w,H=im.size
    print(f'=== {f} taille={im.size}')
    res=[]
    for y in range(y0,H):
        vals=[lum(px[x,y]) for x in range(30,1050,2)]
        med=statistics.median(vals)
        n=sum(1 for v in vals if v-med>8)
        res.append((y,n,round(med,1)))
    # premiere rangee avec n>=10 apres une zone calme
    prem=None
    for y,n,m in res:
        if n>=10: prem=y; break
    print('  premiere rangee a >=10 px d encre :', prem)
    print('  profil (y:n) tous les 10 :', [f'{y}:{n}' for y,n,m in res if y%10==0][:40])
