# m5 — bord lateral exact du panneau et de la plaque TRANCHER : balayage RGB sur une ligne SANS texte.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def bal(im,nom,y,xs):
    px=im.load()
    print(f'  {nom} y={y}')
    for x in xs: print(f'    x={x:4d} {px[x,y]}')
r=charge(REF)
bal(r,'REF',1290,list(range(38,66))+list(range(1016,1046)))
