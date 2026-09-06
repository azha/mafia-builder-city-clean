#!/usr/bin/env python3
"""m39 - carte des ecarts : le cadre de la reference et celui du jeu alignes sur
leur coin haut-gauche, difference par bande de 40 rangees (px a >20/255).
Sert de FILET : toute bande anormalement chargee designe une partie non encore
inventoriee. Controle positif : une bande de gouttiere vide doit sortir bas.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
b=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('tailles', a.size, b.size)
pa,pb=a.load(),b.load()
X1,Y1=21,452; X2,Y2=18,482
W,H=1032,1627
for y0 in range(0,H,40):
    n=0; tot=0
    for y in range(y0,min(y0+40,H)):
        for x in range(0,W,2):
            p=pa[X1+3+x,Y1+y]; q=pb[X2+4+x,Y2+y]
            if max(abs(p[i]-q[i]) for i in range(3))>20: n+=1
            tot+=1
    print(f'  local y {y0:4d}..{min(y0+39,H-1):4d} : {n:5d}/{tot} ({100*n/tot:5.1f} %)')
