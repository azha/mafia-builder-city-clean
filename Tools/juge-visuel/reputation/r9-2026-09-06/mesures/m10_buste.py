# -*- coding: utf-8 -*-
"""m10 — le BUSTE : bbox de la peau (creme2 #b9ad92), bbox du torse (carte2 #16191b sur fond
#111823), largeur d'epaules, hauteur totale. Le SVG est declare width=96 height=119 CSS
=> 345,6 x 428,4 px a x3,6 : c'est la grandeur opposable.
Contrôle positif : la carte .prt mesure 424/425 px (118 CSS) des deux cotes (m02) — donc
  toute difference de buste n'est PAS une difference d'echelle de la carte.
Contrôle négatif : le meme masque applique a la colonne de droite (.lect) doit rendre ~0.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
PEAU=(0xb9,0xad,0x92); TORSE=(0x16,0x19,0x1b); CREME=(0xea,0xe0,0xc8)
def prox(p,q,t): return abs(p[0]-q[0])<=t and abs(p[1]-q[1])<=t and abs(p[2]-q[2])<=t
def bbox(im,box,cible,tol,nom):
    px=im.load();x0,y0,x1,y1=box;xs=[];ys=[];n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if prox(px[x,y],cible,tol): xs.append(x);ys.append(y);n+=1
    if not n: print('   %s : AUCUN pixel'%nom); return None
    d=dict(x0=min(xs),x1=max(xs),y0=min(ys),y1=max(ys),n=n)
    d['w']=d['x1']-d['x0']+1; d['h']=d['y1']-d['y0']+1
    print('   %-26s x=%4d..%4d (w=%4d, %6.2f CSS)  y=%4d..%4d (h=%4d, %6.2f CSS)  n=%d'
          %(nom,d['x0'],d['x1'],d['w'],d['w']/3.6,d['y0'],d['y1'],d['h'],d['h']/3.6,n))
    return d
# fenetres = interieur de la carte .prt  (REF 82..505 / 877..1532 ; CAP 72..496 / 667..1324)
print('REFERENCE (.prt 82..505 x 877..1532)')
rp=bbox(R,(85,880,503,1530),PEAU,14,'peau (visage+cou)')
rt=bbox(R,(85,880,503,1530),TORSE,6,'torse #16191b')
rc=bbox(R,(85,1150,503,1400),CREME,10,'col creme #eae0c8')
print('   contrôle négatif (.lect) :',end=' ')
bbox(R,(560,1000,990,1440),PEAU,14,'peau dans .lect')
print('CAPTURE (.prt 72..496 x 667..1324)')
cp=bbox(C,(75,670,494,1322),PEAU,14,'peau (visage+cou)')
ct=bbox(C,(75,670,494,1322),TORSE,6,'torse #16191b')
cc=bbox(C,(75,900,494,1200),CREME,10,'col creme #eae0c8')
print('   contrôle négatif (.lect) :',end=' ')
bbox(C,(550,760,1000,1180),PEAU,14,'peau dans .lect')
print()
for nom,a,b in (('peau',rp,cp),('torse',rt,ct),('col creme',rc,cc)):
    if a and b:
        print('  %-10s  w REF %4d / CAP %4d  = x%.3f   |  h REF %4d / CAP %4d  = x%.3f'
              %(nom,a['w'],b['w'],b['w']/a['w'],a['h'],b['h'],b['h']/a['h']))
