# m18 — structure verticale : haut/bas du panneau LA SUITE, filet laiton du haut, separateurs,
# plaque TRANCHER, dock. Detection par la colonne x=60..70 (dans le panneau, hors texte) et par
# le gradient de luminance sur une colonne au bord gauche interieur.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
def transitions(im,nom,x0,x1,y0,y1,seuil=4):
    px=im.load(); print(f'  --- {nom} colonne x{x0}..{x1} ---')
    prev=None
    for y in range(y0,y1):
        c=tuple(med([px[x,y][k] for x in range(x0,x1)]) for k in range(3))
        if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>=seuil:
            print(f'    y={y:5d} {c}')
            prev=c
transitions(charge(REF),'REF',58,70,820,2102)
