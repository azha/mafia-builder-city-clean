#!/usr/bin/env python3
"""m04 - les deux captures sont-elles le MEME contenu decale ?
Compare capture1920[y] a capture2400[y+480] sur la zone du cadre visible.
Controle positif : le decalage 480 doit rendre un compte de pixels differents
tres bas ; controle NEGATIF : un decalage de 479 doit rendre un compte eleve.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a=Image.open(os.path.join(D,'capture-1080x1920.png')).convert('RGB')
b=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('tailles', a.size, b.size)
pa,pb=a.load(),b.load()
def diff(dy, y0=200, y1=1690, tol=6):
    n=0; tot=0; mx=0
    for y in range(y0,y1):
        for x in range(0,1080,2):
            p=pa[x,y]; q=pb[x,y+dy]
            d=max(abs(p[0]-q[0]),abs(p[1]-q[1]),abs(p[2]-q[2]))
            tot+=1
            if d>tol: n+=1
            mx=max(mx,d)
    return n,tot,mx
for dy in (479,480,481):
    n,tot,mx=diff(dy)
    print(f'  decalage {dy} : {n} px differents (>6/255) sur {tot} echantillonnes, ecart max {mx}')
