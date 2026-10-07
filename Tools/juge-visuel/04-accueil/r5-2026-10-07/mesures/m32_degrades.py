# m32 — (a) degrade du bouton or (profil vertical au centre, hors libelle) ;
#       (b) degrade du verre du panneau (profil vertical sur une colonne vide a droite).
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
OR={'REF':(651,979,945,1036),'JEU1920':(678,979,865,956),'JEU2400':(678,979,1271,1363)}
PAN={'REF':(825,1636),'JEU1920':(754,1449),'JEU2400':(1162,1855)}
def degrade_or(im,nom):
    px=im.load(); x0,x1,y0,y1=OR[nom]
    xa,xb=x0+12,x0+30   # a gauche du libelle
    print(f'  --- {nom} bouton or, colonne x{xa}..{xb} ---')
    out=[]
    for k in range(0,y1-y0+1,8):
        y=y0+k
        c=tuple(med([px[x,y][i] for x in range(xa,xb)]) for i in range(3))
        out.append(f'{k}:{c}')
    print('    '+' '.join(out))
def degrade_verre(im,nom):
    px=im.load(); y0,y1=PAN[nom]
    print(f'  --- {nom} verre du panneau, colonne x1008..1026 ---')
    out=[]
    for k in range(6,y1-y0-4,60):
        y=y0+k
        c=tuple(med([px[x,y][i] for x in range(1008,1026)]) for i in range(3))
        out.append(f'{k}:{c}')
    print('    '+' '.join(out))
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]:
    im=charge(p); degrade_or(im,n); degrade_verre(im,n)
