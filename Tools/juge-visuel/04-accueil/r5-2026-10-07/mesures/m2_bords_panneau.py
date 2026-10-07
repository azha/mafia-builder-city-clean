# m2 — bords exacts du panneau LA SUITE : on cherche le LISERE (max de gradient) sur une bande
# de lignes situee a l'interieur du panneau, des deux cotes.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge

def profil(im,y0,y1):
    px=im.load(); w,h=im.size
    return [sum(lum(px[x,y]) for y in range(y0,y1))/(y1-y0) for x in range(w)]

def bords(im,nom,y0,y1):
    p=profil(im,y0,y1); w=len(p)
    # bord gauche : plus grand saut |p[x+1]-p[x]| dans 20..200
    g=max(range(20,220), key=lambda x: abs(p[x+1]-p[x]))
    d=max(range(w-220,w-12), key=lambda x: abs(p[x+1]-p[x]))
    print(f'  {nom} y{y0}..{y1}: bord G x={g} (saut {p[g+1]-p[g]:+.1f})  bord D x={d} (saut {p[d+1]-p[d]:+.1f})  largeur={d-g}')
    print(f'      profil G: ' + ' '.join(f'{p[x]:.0f}' for x in range(g-4,g+7)))
    print(f'      profil D: ' + ' '.join(f'{p[x]:.0f}' for x in range(d-6,d+5)))
    return g,d

print('== bande TEXTE du panneau ==')
bords(charge(REF),'REF',1050,1150)
bords(charge(J19),'JEU1920',930,1030)
bords(charge(J24),'JEU2400',1240,1340)
