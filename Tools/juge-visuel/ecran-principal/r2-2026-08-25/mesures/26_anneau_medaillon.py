# -*- coding: utf-8 -*-
"""Epaisseur de l'anneau du medaillon : profil RADIAL (la ligne horizontale passant
par le centre du medaillon EST radiale) ; largeur a mi-hauteur (FWHM) de la
grandeur 'or' = R-B, apres retrait du plancher local. Cote gauche ET cote droit.
Controle positif : le canon doit rendre ~1,5 CSS (border:1.5px du CSS)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def fwhm(path,label,ycen,xcen,ray):
    im=open_img(path); c=css(im); px=im.load()
    y=int(ycen*c)
    for cote,rng in (('gauche',range(int((xcen-ray-6)*c), int((xcen-ray+8)*c))),
                     ('droite',range(int((xcen+ray-8)*c), int((xcen+ray+6)*c)))):
        prof=[(x,(px[x,y][0]-px[x,y][2])) for x in rng]
        floor=min(v for _,v in prof); peak=max(v for _,v in prof)
        half=floor+(peak-floor)/2.0
        hits=[x for x,v in prof if v>=half]
        print(f"  {label} cote {cote}: pic R-B={peak} plancher={floor} ; FWHM = {(max(hits)-min(hits)+1)/c:.2f} CSS "
              f"; largeur totale du signal (>15% du pic) = {(max(x for x,v in prof if v>=floor+0.15*(peak-floor))-min(x for x,v in prof if v>=floor+0.15*(peak-floor))+1)/c:.2f} CSS")

print("attendu canon : border 1.5px CSS")
fwhm(CANON,'canon',40.0,195.83,32.0)
fwhm(CAP16,'cap16',40.29,195.82,34.12)
fwhm(CAP24,'cap24',40.29,195.82,34.12)
print()
print("== 'Verge A' 2400 : contraste sur sa vraie boite ==")
import statistics
def ct(path,x0,x1,y0,y1,label):
    im=open_img(path); c=css(im); px=im.load()
    vals=[px[x,y] for y in range(int(y0*c),int(y1*c)) for x in range(int(x0*c),int(x1*c))]
    lums=sorted(sum(q)/3.0 for q in vals)
    E=[q for q in vals if sum(q)/3.0>=lums[int(len(lums)*0.90)]]; F=[q for q in vals if sum(q)/3.0<=lums[int(len(lums)*0.40)]]
    e=(int(statistics.median([q[0] for q in E])),int(statistics.median([q[1] for q in E])),int(statistics.median([q[2] for q in E])))
    f=(int(statistics.median([q[0] for q in F])),int(statistics.median([q[1] for q in F])),int(statistics.median([q[2] for q in F])))
    print(f"  {label}: encre={hexc(e)} fond={hexc(f)} -> {contrast(e,f):.2f}:1")
ct(CAP24,4,33,80,87.5,'cap24 Verge A')
ct(CAP16,4,33,78,86,'cap16 Verge A')
