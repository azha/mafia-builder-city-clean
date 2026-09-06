# -*- coding: utf-8 -*-
"""m22 — diametre VERTICAL du visage (colonne la plus haute de remplissage peau, bornee
au-dessus par le chapeau et en dessous par le cou). Complete m12 (diametre horizontal).
Contrôle positif : le dessin entier (chapeau->bas du torse) mesure 377 px (REF) / 371 px (CAP)
  — donc le SVG n'est PAS globalement agrandi ; tout ecart local est un ecart de PROPORTION.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
PEAU=(0xb9,0xad,0x92)
def prox(p,q,t): return all(abs(p[k]-q[k])<=t for k in range(3))
for nom,im,cx,ya,yb in (('REF',R,293,1050,1300),('CAP',C,272,850,1100)):
    p=im.load()
    best=(0,None)
    for x in range(cx-30,cx+31):
        ys=[y for y in range(ya,yb) if prox(p[x,y],PEAU,14)]
        if ys and max(ys)-min(ys)+1>best[0]: best=(max(ys)-min(ys)+1,(x,min(ys),max(ys)))
    print('   %s visage : colonne x=%d, y=%d..%d, diametre vertical=%d px (%.2f CSS)'
          %(nom,best[1][0],best[1][1],best[1][2],best[0],best[0]/3.6))
print('   attendu (ry=15 unites, stroke 2, 1 unite = 5,574 px) : remplissage 28 unites = 156 px ; exterieur 32 unites = 178 px')
