#!/usr/bin/env python3
"""m07 - degat de l'occlusion : le contenu du 1920 qui differe du MEME contenu
au 2400 (decalage 480 etabli par m04) est du chrome pose PAR-DESSUS.
On compte, par bande de 10 rangees, les px differents de >12/255 dans
x 30..1050, du haut du cadre (y=2) au bas du bandeau elargi (y=260).
Controle positif : une bande prise a y 800..900 (loin du chrome) doit rendre
un compte quasi nul (le fond seul).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a=Image.open(os.path.join(D,'capture-1080x1920.png')).convert('RGB'); pa=a.load()
b=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); pb=b.load()
print('tailles', a.size, b.size)
def bande(y0,y1):
    n=0; tot=0
    for y in range(y0,y1):
        for x in range(30,1050):
            p=pa[x,y]; q=pb[x,y+480]
            if max(abs(p[i]-q[i]) for i in range(3))>12: n+=1
            tot+=1
    return n,tot
tot_deg=0
for y0 in range(0,270,10):
    n,t=bande(y0,y0+10)
    tot_deg+=n
    print(f'  y {y0:3d}..{y0+9:3d} : {n:5d}/{t} px alteres ({100*n/t:5.1f} %)')
print('  TOTAL y 0..269 :', tot_deg)
n,t=bande(800,900); print(f'  CONTROLE POSITIF y 800..899 (hors chrome) : {n}/{t} ({100*n/t:.2f} %)')
n,t=bande(1600,1690); print(f'  CONTROLE y 1600..1689 (gouttiere basse) : {n}/{t} ({100*n/t:.2f} %)')
