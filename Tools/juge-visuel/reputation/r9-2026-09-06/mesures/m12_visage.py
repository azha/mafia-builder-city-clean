# -*- coding: utf-8 -*-
"""m12 — le VISAGE : ligne la plus large du remplissage peau (= diametre de l'ellipse),
et span exterieur trait-a-trait sur la meme ligne. Puis le CENTRE horizontal du dessin
compare au centre de la carte .prt.
Contrôle positif : la carte .prt = 424 px (REF) / 425 px (CAP) — la BOITE est la meme,
  donc tout ecart mesure ici est un ecart du DESSIN, pas du conteneur.
Contrôle négatif : au-dessus du sommet du chapeau, la ligne la plus large doit etre 0.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
PEAU=(0xb9,0xad,0x92); TRAIT=(0x0b,0x10,0x16); TORSE=(0x16,0x19,0x1b); CREME=(0xea,0xe0,0xc8)
def prox(p,q,t): return abs(p[0]-q[0])<=t and abs(p[1]-q[1])<=t and abs(p[2]-q[2])<=t
def maxrun(im,cible,tol,x0,x1,y0,y1):
    px=im.load(); best=(0,None,None)
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if prox(px[x,y],cible,tol)]
        if xs:
            span=max(xs)-min(xs)+1
            if span>best[0]: best=(span,y,(min(xs),max(xs)))
    return best
def outer(im,y,x0,x1):
    px=im.load()
    xs=[x for x in range(x0,x1) if not prox(px[x,y],(0x11,0x18,0x23),9)]
    return (min(xs),max(xs)) if xs else None

for nom,im,cx_card,(px0,px1),(py0,py1) in (
    ('REF',R,(82+505)/2,(85,503),(880,1530)),
    ('CAP',C,(72+496)/2,(75,494),(670,1322))):
    print('%s  (centre de la carte .prt = %.1f)'%(nom,cx_card))
    s,y,(a,b)=maxrun(im,PEAU,14,px0,px1,py0,py1)
    print('   visage : ligne la plus large y=%d  x=%d..%d  largeur=%d px (%.2f CSS)  centre=%.1f  (ecart au centre de carte %+.1f px)'
          %(y,a,b,s,s/3.6,(a+b)/2,(a+b)/2-cx_card))
    o=outer(im,y,px0,px1)
    print('   sur la MEME ligne, span exterieur (hors fond #111823) : %s  largeur=%d  centre=%.1f'%(o,o[1]-o[0]+1,(o[0]+o[1])/2))
    s2,y2,(a2,b2)=maxrun(im,TORSE,6,px0,px1,py0,py1)
    print('   torse+chapeau : ligne la plus large y=%d x=%d..%d largeur=%d px (%.2f CSS) centre=%.1f (ecart %+.1f)'
          %(y2,a2,b2,s2,s2/3.6,(a2+b2)/2,(a2+b2)/2-cx_card))
    s3,y3,(a3,b3)=maxrun(im,CREME,10,px0,px1,py0,py1)
    print('   col (creme) : ligne la plus large y=%d x=%d..%d largeur=%d px (%.2f CSS) centre=%.1f (ecart %+.1f)'
          %(y3,a3,b3,s3,s3/3.6,(a3+b3)/2,(a3+b3)/2-cx_card))
    print('   contrôle négatif (bande de 40 px sous le haut de carte) :',maxrun(im,PEAU,14,px0,px1,py0,py0+40)[0])
    print()
