#!/usr/bin/env python3
"""m27 - geometrie horizontale des tuiles (F8), ligne de balayage teal (F9),
enseigne (F13), CTA (F7), panneau bas. Coordonnees LOCALES du cadre.
Convention de bord : NOMINALE mi-alpha pour les liserés.
Controle positif : la carte portrait doit ressortir a x 61..484 en ref (m19).
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAD={'ref':('reference-1080x2102.png',21,452,1037),'jeu':('capture-1080x2400.png',18,482,1043)}
TUILE={'ref':(548,648),'jeu':(517,608)}
ELAST={'ref':(396,1161),'jeu':(392,1175)}
ENS={'ref':(29,217),'jeu':(29,211)}      # haut du bloc enseigne .. filet or
CTA={'ref':(1500,1594),'jeu':(1507,1594)}
PANN={'ref':(1195,1467),'jeu':(1208,1473)}
for nom in ('ref','jeu'):
    f,X0,Y0,WMAX=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size} largeur interieure locale 0..{WMAX}')
    a,c=TUILE[nom]
    cols=[x for x in range(430,1040)
          if sum(1 for y in range(a+3,c-2) if lum(px[X0+x,Y0+y])-max(lum(px[X0+x-4,Y0+y]),lum(px[X0+x+4,Y0+y]))>3)>=40]
    print(f'  tuile 1 : colonnes de liseré {cols[:4]} ... {cols[-4:]} -> x {cols[0]}..{cols[-1]} (l={cols[-1]-cols[0]+1})')
    print(f'    marge droite de la tuile = {WMAX-cols[-1]} px · gouttiere carte->tuile = {cols[0]-484}')
    # .elast : liserés verticaux
    e0,e1=ELAST[nom]
    colse=[x for x in range(0,1044)
           if sum(1 for y in range(e0+5,e1-4) if lum(px[X0+x,Y0+y])-max(lum(px[X0+max(0,x-4),Y0+y]),lum(px[X0+min(1043,x+4),Y0+y]))>3)>=400]
    print(f'  .elast : liserés verticaux {colse}')
    # ligne de balayage teal : rangee ou une longue bande cyan/teal traverse
    best=None
    for y in range(e0,e1):
        n=sum(1 for x in range(60,980,2) if px[X0+x,Y0+y][2]>px[X0+x,Y0+y][0]+18 and px[X0+x,Y0+y][1]>px[X0+x,Y0+y][0]+18)
        if best is None or n>best[1]: best=(y,n)
    y=best[0]
    xs=[x for x in range(0,1044) if px[X0+x,Y0+y][2]>px[X0+x,Y0+y][0]+18 and px[X0+x,Y0+y][1]>px[X0+x,Y0+y][0]+18]
    print(f'  balayage teal : rangee la plus chargee y={y} ({best[1]} px), x {min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1})')
    ep=[yy for yy in range(y-12,y+13)
        if sum(1 for x in range(300,900,2) if px[X0+x,Y0+yy][2]>px[X0+x,Y0+yy][0]+12 and px[X0+x,Y0+yy][1]>px[X0+x,Y0+yy][0]+12)>150]
    print(f'    epaisseur (rangees) {ep} -> {len(ep)} px · position dans .elast = {100*(y-e0)/(e1-e0):.1f} %')
    # CTA
    a2,b2=CTA[nom]
    colsc=[x for x in range(0,1044)
           if sum(1 for y in range(a2+3,b2-2) if px[X0+x,Y0+y][0]>px[X0+x,Y0+y][1]>px[X0+x,Y0+y][2] and px[X0+x,Y0+y][0]>100)>=60]
    print(f'  CTA local y {a2}..{b2} (h={b2-a2+1}) · x {colsc[0]}..{colsc[-1]} (l={colsc[-1]-colsc[0]+1})')
    # enseigne
    a3,b3=ENS[nom]
    print(f'  enseigne local y {a3}..{b3} (h={b3-a3+1})')
    a4,b4=PANN[nom]
    print(f'  panneau bas local y {a4}..{b4} (h={b4-a4+1})')
