#!/usr/bin/env python3
"""m23 - bord bas de la calotte (courbe front/cheveux) et PINCEMENT du crane.
- courbe : pour chaque x, premiere rangee de visage ; echantillonnee a 9 fractions
  de la LARGEUR DU VISAGE mesuree a mi-hauteur du visage (memes fractions des 2 cotes)
- sagitta = y(centre) - moyenne(y aux fractions +-0,9)
- pincement = min de la silhouette entre la rangee la plus large de la calotte et
  la rangee la plus large du bas de la tete, rapporte au max de la calotte
Controle positif : le centre echantillonne doit tomber a x=272 des 2 cotes.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAD={'ref':('reference-1080x2102.png',21,452,(17,24,35)),
     'jeu':('capture-1080x2400.png',18,482,(13,22,34))}
CREME2=(185,173,146)
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
for nom in ('ref','jeu'):
    f,X0,Y0,FOND=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    sil={}; vis={}
    for y in range(560,800):
        s=[];v=[]
        for x in range(150,400):
            p=px[X0+x,Y0+y]
            if L1(p,FOND)<=18: continue
            s.append(x)
            if L1(p,CREME2)<=90: v.append(x)
        if s and (s[-1]-s[0]+1)<200: sil[y]=(s[0],s[-1],s[-1]-s[0]+1)
        if v: vis[y]=(v[0],v[-1],v[-1]-v[0]+1)
    yvis=min(vis); Wvmax=max(v[2] for v in vis.values())
    chin=max(y for y in vis if vis[y][2]>0.60*Wvmax)
    ymid=(yvis+chin)//2
    g,d,W=vis[ymid]; xc=(g+d)/2
    print(f'  visage a mi-hauteur y={ymid} : x {g}..{d} (l={W}) centre {xc}')
    bord={}
    for x in range(150,400):
        for y in range(yvis-2,chin):
            if L1(px[X0+x,Y0+y],CREME2)<=90: bord[x]=y; break
    ech=[]
    for fr in (-0.9,-0.7,-0.5,-0.25,0,0.25,0.5,0.7,0.9):
        x=int(round(xc+fr*W/2))
        ech.append((fr,x,bord.get(x)))
    print('  bord bas (fraction, x, y) :', ech)
    yc=bord.get(int(round(xc)))
    ys=[bord.get(int(round(xc-0.9*W/2))),bord.get(int(round(xc+0.9*W/2)))]
    if all(v is not None for v in ys+[yc]):
        print(f'  sagitta sur +-0,9 de la demi-largeur : {yc-(ys[0]+ys[1])/2:+.1f} px '
              f'(centre {yc}, bords {ys})')
    # pincement
    ycalmax=max((y for y in sil if y<yvis), key=lambda y:sil[y][2])
    Wcalmax=sil[ycalmax][2]
    ybasmax=max(sil, key=lambda y: sil[y][2] if y>chin-60 else 0)
    entre=[(y,sil[y][2]) for y in sil if ycalmax<y<ymid+40]
    ymin,Wmin=min(entre,key=lambda t:t[1])
    print(f'  calotte la plus large : y={ycalmax} W={Wcalmax} · '
          f'pincement : y={ymin} W={Wmin} ({100*Wmin/Wcalmax:.1f} % du max) · '
          f'reprise en bas : W={max(sil[y][2] for y in sil if y>ymin)}')
