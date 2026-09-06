#!/usr/bin/env python3
"""m40 - aplats : mediane d'une fenetre pour chaque fond (>=3 px de tout bord).
Controle positif : le jeton or_filet doit sortir a (176,141,62) +-2 des 2 cotes.
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAD={'ref':('reference-1080x2102.png',21,452),'jeu':('capture-1080x2400.png',18,482)}
FEN=[('fond du cadre (gouttiere gauche)', (8,24,700,760),(8,24,700,760)),
     ('fond .elast (bas, colonne droite)',(600,900,1100,1150),(600,900,1110,1160)),
     ('interieur tuile 2',                (700,900,690,740),(700,900,650,700)),
     ('interieur boite compteur 1',       (60,140,265,340),(60,140,260,335)),
     ('fond carte portrait',              (80,180,450,520),(80,180,445,515)),
     ('fond panneau bas',                 (700,950,1220,1300),(700,950,1230,1310)),
     ('fond CTA',                         (700,950,1520,1570),(700,950,1525,1575)),
     ('fond enseigne',                    (60,140,40,120),(60,140,40,120)),
     ('filet or du cadre (rail gauche)',  (1,2,700,900),(1,2,700,900)),
     ('remplissage torse',                (250,300,980,1030),(250,300,980,1030))]
print(f'{"aplat":36s} {"ref":>18s} {"jeu":>18s}  {"dmax":>5s}')
for lab,fr,fj in FEN:
    out=[]
    for nom,fen in (('ref',fr),('jeu',fj)):
        f,X0,Y0=CAD[nom]
        im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
        xa,xb,ya,yb=fen
        ps=[px[X0+x,Y0+y] for y in range(ya,yb) for x in range(xa,xb)]
        out.append(tuple(int(statistics.median([p[i] for p in ps])) for i in range(3)))
    d=max(abs(out[0][i]-out[1][i]) for i in range(3))
    print(f'{lab:36s} {str(out[0]):>18s} {str(out[1]):>18s}  {d:5d}')
