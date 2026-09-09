#!/usr/bin/env python3
"""m10 - ou est reellement le titre au 1080x1920 ? scan brut par rangee et par
colonne d'encre doree (r>g>b, lum>70) dans y 0..240, plus vidage d'une tranche.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im=Image.open(os.path.join(D,'capture-1080x1920.png')).convert('RGB'); px=im.load()
print('taille', im.size)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
print('-- rangees y 40..200, encre doree lum>70, par tranche de x --')
print('  y  |x300-430|x430-650|x650-780|')
for y in range(40,200,4):
    a=sum(1 for x in range(300,430) if px[x,y][0]>px[x,y][1]>px[x,y][2] and lum(px[x,y])>70)
    b=sum(1 for x in range(430,650) if px[x,y][0]>px[x,y][1]>px[x,y][2] and lum(px[x,y])>70)
    c=sum(1 for x in range(650,780) if px[x,y][0]>px[x,y][1]>px[x,y][2] and lum(px[x,y])>70)
    print(f'{y:4d} |{a:8d}|{b:8d}|{c:8d}|')
print('-- valeurs brutes le long de y=88 (milieu du titre) tous les 20 px --')
print([f'{x}:{px[x,88]}' for x in range(320,780,20)])
im2=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); px2=im2.load()
print('-- memes valeurs au 2400, y=568 --')
print([f'{x}:{px2[x,568]}' for x in range(320,780,20)])
