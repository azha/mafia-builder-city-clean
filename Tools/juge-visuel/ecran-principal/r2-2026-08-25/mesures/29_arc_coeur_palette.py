# -*- coding: utf-8 -*-
"""(a) COEUR de l'arc : profil radial a un angle donne, on lit le pixel du sommet
       (pas une mediane de classification) ; controle : le fond du medaillon au meme angle
   (b) palette globale des ZONES DE CHROME (bandeau / fiche / dock) : histogramme quantifie"""
import sys, os, math, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from PIL import Image

def coeur(path,label,cx,cy,angles,rmin,rmax):
    im=open_img(path); c=css(im); px=im.load()
    for nom,deg in angles:
        prof=[]
        r=rmin
        while r<=rmax:
            a=math.radians(deg)
            x=int((cx+r*math.cos(a))*c); y=int((cy+r*math.sin(a))*c)
            prof.append((round(r,1),px[x,y]))
            r+=0.3
        if nom=='teal': best=max(prof,key=lambda t:t[1][2]-t[1][0])
        else:           best=max(prof,key=lambda t:t[1][0]-t[1][2])
        print(f"  {label} {nom} a {deg}deg : sommet r={best[0]} couleur={hexc(best[1])} rgb{best[1]}")

print("== COEUR DE L'ARC ==")
coeur(CANON,'canon',195.83,44.5,[('teal',205),('braise',335)],8,24)
coeur(CAP16,'cap16',195.82,45.0,[('teal',205),('braise',335)],10,30)
coeur(CAP24,'cap24',195.82,45.0,[('teal',205),('braise',335)],10,30)

print()
print("== PALETTE DES ZONES DE CHROME (6 couleurs dominantes, % d'aire) ==")
def pal(path,label,zones):
    im=open_img(path); c=css(im)
    for nom,(x0,y0,x1,y1) in zones:
        r=im.crop((int(x0*c),int(y0*c),int(x1*c),int(y1*c)))
        q=r.quantize(colors=6, method=Image.MEDIANCUT).convert('RGB')
        cols=q.getcolors(64)
        tot=sum(n for n,_ in cols)
        cols.sort(reverse=True)
        s=" ".join(f"{hexc(v)}:{100.*n/tot:.0f}%" for n,v in cols)
        print(f"  {label:6s} {nom:10s} {s}")
pal(CANON,'canon',[('bandeau',(0,0,392,51)),('fiche',(13,427,379,594)),('dock',(1,606,391,690))])
pal(CAP16,'cap16',[('bandeau',(0,0,392,50)),('fiche',(12,426,380,595)),('dock',(1,605,391,689))])
pal(CAP24,'cap24',[('bandeau',(0,0,392,50)),('fiche',(12,600,380,769))
                  ,('dock',(1,780,391,863))])
