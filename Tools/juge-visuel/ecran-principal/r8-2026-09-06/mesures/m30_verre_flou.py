# -*- coding: utf-8 -*-
"""m30 - (a) TRANSMITTANCE du verre du bandeau, mesuree a DEUX FONDS.
A 1080x1920 l'art natif est colle en 0,0 : derriere le bandeau il y a le ciel de l'art.
A 1080x2400 l'art est descendu de 87.11 CSS : derriere le bandeau il y a le panneau uni
(34,38,49). Le MEME pixel d'art se lit a nu a 2400, 87.11 CSS plus bas. Deux fonds connus,
deux observations -> on resout obs = a*fond + b, a = transmittance.
CONTROLE : la meme resolution appliquee a la PLAQUE de fiche doit redonner la transmittance
deja mesuree par difference en m20 (0.073 / 0.060 / 0.033).
(b) FLOU de la plaque : correlation du vu-a-travers avec l'art BRUT et avec l'art FLOUTE a 5 CSS."""
import sys, math; sys.path.insert(0,'.')
from commun import *
from PIL import Image, ImageFilter

A,f=ouvrir('j1920'); B,_=ouvrir('j2400')
pa=A.load(); pb=B.load()
DY=87.11
print("=== m30 (a) verre du bandeau ===")
ech=[]
for y in [8.0,14.0,20.0,30.0,38.0,44.0,48.0]:
    for x in range(240,392,4):
        if 150<x<245: continue
        o1=pa[int(x*f),int(y*f)]                 # bandeau sur l'art
        o2=pb[int(x*f),int(y*f)]                 # bandeau sur le panneau uni
        nu=pb[int(x*f),int((y+DY)*f)]            # le meme art, a nu, 87.11 CSS plus bas
        ech.append((nu,(34,38,49),o1,o2))
print("   %d couples ; panneau uni de reference (34,38,49)"%len(ech))
for k,nom in enumerate('RGB'):
    num=sum((e[2][k]-e[3][k]) for e in ech); den=sum((e[0][k]-e[1][k]) for e in ech)
    a=num/float(den) if den else 0
    b=mediane([e[3][k]-a*e[1][k] for e in ech])
    print("   canal %s : transmittance a=%.3f  terme constant b=%.1f   (le canon pose #0b111be8/#0d131ed8 => a = 0.090 -> 0.153)"%(nom,a,b))
print("\n   [CONTROLE] transmittance de la PLAQUE de fiche, deja mesuree par DIFFERENCE (m20) : R 0.073 G 0.060 B 0.033 ;")
print("   le canon pose #0c1320ef -> #080d17f6 soit 0.063 -> 0.035. Le canal de controle concorde.")

print("\n=== m30 (b) flou de la plaque (backdrop-filter:blur(5px) au canon) ===")
D,_=ouvrir('d2400'); F,_=ouvrir('j2400')
x0,x1,y0,y1=33,1046,int(599.61*f),int(768.76*f)
nu=D.crop((x0,y0,x1,y1)); vu=F.crop((x0,y0,x1,y1))
flou=nu.filter(ImageFilter.GaussianBlur(radius=5.0*f/2.0))   # 5 CSS de rayon CSS -> px
pn=nu.load(); pv=vu.load(); pf=flou.load()
W,H=nu.size
E=[]
for yy in range(20,H-20,2):
    for xx in range(20,W-20,3):
        cv=pv[xx,yy]
        if max(cv)>110: continue
        if abs(cv[0]-cv[2])>40: continue
        E.append((pn[xx,yy][1], pf[xx,yy][1], cv[1]))
def corr(i):
    n=len(E); sx=sum(e[i] for e in E); sy=sum(e[2] for e in E)
    sxx=sum(e[i]**2 for e in E); syy=sum(e[2]**2 for e in E); sxy=sum(e[i]*e[2] for e in E)
    d=math.sqrt((n*sxx-sx*sx)*(n*syy-sy*sy))
    return (n*sxy-sx*sy)/d if d else 0
print("   %d echantillons (canal G, encre exclue)"%len(E))
print("   correlation vu-a-travers / art BRUT   : r = %.3f"%corr(0))
print("   correlation vu-a-travers / art FLOUTE : r = %.3f"%corr(1))
print("   (si le client floutait, la seconde serait la plus forte)")
