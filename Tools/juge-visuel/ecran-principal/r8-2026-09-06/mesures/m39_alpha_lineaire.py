# -*- coding: utf-8 -*-
"""m39 - ALPHA REEL des voiles, resolu en espace LINEAIRE (le client compose en lineaire,
`m_ActiveColorSpace: 1` ; la maquette est composee en sRGB par Chrome). Comparer des
transmittances sRGB entre les deux revient a comparer deux unites differentes.
Methode : pour chaque pixel, lin(obs) = a*lin(fond) + (1-a)*lin(voile) -> on resout a.
CONTROLES :
 (1) la VOLUTE gauche du jeu : le canon la pose a opacite .28 ; si le client la compose en
     lineaire a .28, la prediction doit tomber au bit pres sur le pixel mesure ;
 (2) la PLAQUE de fiche : le canon pose #0c1320ef -> #080d17f6, soit a = 0.063 -> 0.035."""
import sys, math; sys.path.insert(0,'.')
from commun import *
def lin(v):
    v=v/255.0
    return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
def srgb(u):
    u=max(0.0,min(1.0,u))
    v = 12.92*u if u<=0.0031308 else 1.055*(u**(1/2.4))-0.055
    return v*255.0

print("=== m39 ===")
print("\n[CONTROLE 1] volute gauche : creme (234,224,200) a alpha 0.28 sur le fond mesure, en LINEAIRE")
for cle,fond,mes in [('j2400',(16,20,31),(133,127,115)),('j1920',(56,62,73),(139,135,127))]:
    pred=tuple(round(srgb(0.28*lin(JETONS['creme'][k]) + 0.72*lin(fond[k]))) for k in range(3))
    predS=tuple(round(0.28*JETONS['creme'][k] + 0.72*fond[k]) for k in range(3))
    print("   %-6s fond %s : prediction LINEAIRE %s | prediction sRGB %s | MESURE %s  -> ecart lineaire %d, ecart sRGB %d"
          %(cle,fond,pred,predS,mes,dist_max(pred,mes),dist_max(predS,mes)))

print("\n[CONTROLE 2] plaque de fiche : alpha resolu en lineaire (canon 0.937 -> 0.965 d'opacite, soit 0.063 -> 0.035 de transmittance)")
A,f=ouvrir('j2400'); B,_=ouvrir('d2400')
pa=A.load(); pb=B.load()
E=[]
for y in range(int(610*f),int(760*f),2):
    for x in range(int(25*f),int(370*f),3):
        cv=pa[x,y]; cn=pb[x,y]
        if max(cv)>110 or abs(cv[0]-cv[2])>40: continue
        E.append((cn,cv))
# resoudre a et la couleur du voile : lin(obs) = a*lin(fond) + c   (c = (1-a)*lin(voile))
for k in range(3):
    n=len(E); sx=sum(lin(e[0][k]) for e in E); sy=sum(lin(e[1][k]) for e in E)
    sxx=sum(lin(e[0][k])**2 for e in E); sxy=sum(lin(e[0][k])*lin(e[1][k]) for e in E)
    a=(n*sxy-sx*sy)/(n*sxx-sx*sx)
    print("   canal %s : transmittance LINEAIRE a = %.4f  (canon 0.063 -> 0.035)"%('RGB'[k],a))

print("\n[MESURE] verre du bandeau : transmittance LINEAIRE, deux fonds (art a 1920 / panneau uni a 2400)")
A,f=ouvrir('j1920'); B,_=ouvrir('j2400')
pa=A.load(); pb=B.load(); DY=87.11
E=[]
for y in [8.0,14.0,20.0,30.0,38.0,44.0,48.0]:
    for x in range(240,392,3):
        o1=pa[int(x*f),int(y*f)]; o2=pb[int(x*f),int(y*f)]; nu=pb[int(x*f),int((y+DY)*f)]
        E.append((nu,(34,38,49),o1,o2))
print("   %d couples"%len(E))
for k in range(3):
    num=sum(lin(e[2][k])-lin(e[3][k]) for e in E)
    den=sum(lin(e[0][k])-lin(e[1][k]) for e in E)
    a=num/den
    print("   canal %s : transmittance LINEAIRE a = %.4f   (canon : 0.090 en haut -> 0.153 en bas)"%('RGB'[k],a))
print("\n   [rappel] la transmittance sRGB apparente mesuree en m30 valait 0.384/0.370/0.350 :")
print("   comparer CE nombre a l'alpha CSS du canon revient a comparer deux espaces -- c'est le")
print("   piege que la doctrine du dossier signale. Seule la colonne LINEAIRE ci-dessus est opposable.")
