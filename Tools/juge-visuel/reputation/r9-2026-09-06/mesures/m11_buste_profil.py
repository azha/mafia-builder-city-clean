# -*- coding: utf-8 -*-
"""m11 — coupe horizontale du visage et des epaules : ou commence/finit le remplissage,
et quelle EPAISSEUR fait le trait sombre (#0b1016) qui les cerne dans le SVG (stroke-width 2
unites = 2/62*345,6 = 11,1 px a l'echelle du dessin).
Contrôle positif : la carte .prt (118 CSS) fait 424 px (REF) / 425 px (CAP) — meme boite.
Contrôle négatif : la meme coupe prise 40 px SOUS le bas du torse ne doit trouver aucun
  remplissage (verifie et imprime).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def prox(p,q,t): return abs(p[0]-q[0])<=t and abs(p[1]-q[1])<=t and abs(p[2]-q[2])<=t
PEAU=(0xb9,0xad,0x92); TRAIT=(0x0b,0x10,0x16); TORSE=(0x16,0x19,0x1b)
def coupe(im,y,x0,x1,nom):
    px=im.load(); segs=[]; cur=None
    def cls(c):
        if prox(c,PEAU,14): return 'P'
        if prox(c,TRAIT,7): return 'T'
        if prox(c,TORSE,6): return 'C'
        return '.'
    for x in range(x0,x1):
        k=cls(px[x,y])
        if cur and cur[0]==k: cur[2]=x
        else:
            if cur: segs.append(tuple(cur))
            cur=[k,x,x]
    segs.append(tuple(cur))
    s=' '.join('%s:%d-%d(%d)'%(k,a,b,b-a+1) for k,a,b in segs if k!='.' or b-a>6)
    print('  %-28s y=%4d  %s'%(nom,y,s))
    return segs
# centre vertical du visage : REF ellipse cy=32 -> y = svgtop + 32/78*428.4
# on prend la ligne des YEUX+2 : plutot le milieu mesure de la peau (m10)
print('REFERENCE')
coupe(R,(1099+1352)//2,110,480,'coupe visage (mi-peau)')
coupe(R,1380,110,480,'coupe epaules (bas torse)')
coupe(R,1470,110,480,'contrôle négatif (sous torse)')
print('CAPTURE')
coupe(C,(894+1152)//2,100,470,'coupe visage (mi-peau)')
coupe(C,1175,100,470,'coupe epaules (bas torse)')
coupe(C,1250,100,470,'contrôle négatif (sous torse)')
