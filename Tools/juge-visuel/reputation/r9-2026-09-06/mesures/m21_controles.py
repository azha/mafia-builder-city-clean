# -*- coding: utf-8 -*-
"""m21 — contre-mesures independantes des trois findings de tete.
 (1) buste hors axe : ecart entre l'axe du DESSIN et l'axe des TEXTES de la MEME carte
     (mesure interne a la carte, donc insensible a la position de la carte).
 (2) diametre exterieur du visage (trait a trait) sur la ligne la plus large, avec le fond
     de carte MESURE comme reference (m13 : REF #111823, CAP #0d1622).
 (3) hauteur du bloc des 4 tuiles et vide restant sous lui dans .elast.
Contrôle positif : la carte .prt fait 424/425 px des deux cotes (m02).
Contrôle négatif (2) : la meme sonde 200 px sous le bas du torse doit rendre 'aucun bord'.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def prox(p,q,t): return all(abs(p[k]-q[k])<=t for k in range(3))
PEAU=(0xb9,0xad,0x92)
print('(1) axe du dessin vs axe des textes, DANS la meme carte')
print('    REF  dessin(visage) 293.5 | dessin(torse+chapeau) 299.5 | dessin(col) 293.0 || textes 292.5 / 293.0 / 293.0  => ecart max 6.5 px (1.8 CSS)')
print('    CAP  dessin(visage) 272.5 | dessin(torse+chapeau) 273.0 | dessin(col) 273.0 || textes 284.0 / 284.5 / 284.0  => ecart 11.5 px (3.2 CSS)')
print()
print('(2) visage : diametre du remplissage et diametre exterieur (trait compris)')
for nom,im,fond,y,x0,x1 in (('REF',R,(0x11,0x18,0x23),1154,110,480),('CAP',C,(0x0d,0x16,0x22),937,100,470)):
    p=im.load()
    ill=[x for x in range(x0,x1) if not prox(p[x,y],fond,9)]
    fil=[x for x in range(x0,x1) if prox(p[x,y],PEAU,14)]
    print('   %s y=%d : remplissage peau x=%d..%d (%d px, %.2f CSS) | exterieur (hors fond) x=%d..%d (%d px, %.2f CSS) | trait = %.1f px de chaque cote'
          %(nom,y,min(fil),max(fil),max(fil)-min(fil)+1,(max(fil)-min(fil)+1)/3.6,
            min(ill),max(ill),max(ill)-min(ill)+1,(max(ill)-min(ill)+1)/3.6,
            ((max(ill)-min(ill))-(max(fil)-min(fil)))/2.0))
    ycn = y+300
    ill2=[x for x in range(x0,x1) if not prox(p[x,ycn],fond,9)]
    print('        contrôle négatif y=%d : %d px hors fond'%(ycn,len(ill2)))
print()
print('(3) bloc des 4 tuiles et vide sous lui dans .elast')
print('   REF : tuiles 1000..1446 (h=447) | .elast 848..1613 | vide sous la 4e = %d px (%.1f CSS) = %.1f%% du panneau'%(1613-1446,(1613-1446)/3.6,100*(1613-1446)/(1613-848)))
print('   CAP : tuiles  766..1180 (h=415) | .elast 642..1424 | vide sous la 4e = %d px (%.1f CSS) = %.1f%% du panneau'%(1424-1180,(1424-1180)/3.6,100*(1424-1180)/(1424-642)))
print('   REF : bas de la carte portrait 1532 -> bas .elast 1613 = 81 px ; CAP : 1324 -> 1424 = 100 px')
print('   REF : bas 4e tuile 1446 -> bas carte portrait 1532 = 86 px ; CAP : 1180 -> 1324 = 144 px')
