# -*- coding: utf-8 -*-
"""m43 - LES TROIS SURFACES TRANSLUCIDES, confrontees aux DEUX modeles de melange.
Pour chacune : le pixel MESURE, la prediction sRGB (ce que Chrome produit -> la maquette) et la
prediction LINEAIRE (alpha du canon recopie tel quel dans un moteur en lineaire).
Le modele qui gagne dit si l'alpha a ete CONVERTI ou RECOPIE. Un ecart SYSTEMATIQUE ne prouve
une erreur de modele que s'il est le meme sur les trois -- c'est justement ce qu'on teste."""
import sys, math; sys.path.insert(0,'.')
from commun import *
def lin(v):
    v=v/255.0
    return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
def srgb(u):
    u=max(0.0,min(1.0,u))
    return (12.92*u if u<=0.0031308 else 1.055*(u**(1/2.4))-0.055)*255.0
def pred(fond,voile,t,espace):
    if espace=='srgb': return tuple(t*fond[k]+(1-t)*voile[k] for k in range(3))
    return tuple(srgb(t*lin(fond[k])+(1-t)*lin(voile[k])) for k in range(3))

A,f=ouvrir('j1920'); B,_=ouvrir('j2400'); D,_=ouvrir('d2400')
pa=A.load(); pb=B.load(); pd=D.load()
print("=== m43 : trois surfaces translucides x deux modeles ===\n")
res=[]
# 1) VOILE DU BANDEAU : voile (12,18,29) t=0.128 a mi-hauteur (canon .barre)
S=[]
for yc in [22.0,30.0,38.0,46.0]:
    yi=int(yc*f)
    for x in range(0,1080,4):
        art=pb[x,yi+240]; obs=pa[x,yi]
        if max(obs)>150 or abs(obs[0]-obs[2])>35: continue
        if 150<x/f<245: continue
        S.append((art,obs))
ma=tuple(int(mediane([s[0][k] for s in S])) for k in range(3))
mo=tuple(int(mediane([s[1][k] for s in S])) for k in range(3))
res.append(("voile du bandeau (.barre, t=0.128)", (12,18,29), 0.128, ma, mo, len(S)))
# 2) PLAQUE DE FICHE : voile (10,16,27) t=0.049 a mi-hauteur
S=[]
for y in range(int(650*f),int(740*f),3):
    for x in range(int(30*f),int(365*f),4):
        cv=pb[x,y]; cn=pd[x,y]
        if max(cv)>110 or abs(cv[0]-cv[2])>40: continue
        S.append((cn,cv))
ma=tuple(int(mediane([s[0][k] for s in S])) for k in range(3))
mo=tuple(int(mediane([s[1][k] for s in S])) for k in range(3))
res.append(("plaque de fiche (.fiche, t=0.049)", (10,16,27), 0.049, ma, mo, len(S)))
# 3) VOLUTE gauche : encre creme a t=0.28 (c'est l'ENCRE qui est translucide : fond = bandeau)
for cle,px_,fond,mes in [('j2400',pb,(16,20,31),(133,127,115)),('j1920',pa,(56,62,73),(139,135,127))]:
    res.append(("volute gauche %s (.volute, opacite 0.28)"%cle, JETONS['creme'], 0.28, fond, mes, 1))
print("surface | fond mesure | MESURE | prediction sRGB | prediction LINEAIRE")
for nom,voile,t,fond,mes,n in res:
    if nom.startswith("volute"):
        ps=tuple(t*voile[k]+(1-t)*fond[k] for k in range(3))
        pl=tuple(srgb(t*lin(voile[k])+(1-t)*lin(fond[k])) for k in range(3))
    else:
        ps=pred(fond,voile,t,'srgb'); pl=pred(fond,voile,t,'lin')
    ps=tuple(round(v) for v in ps); pl=tuple(round(v) for v in pl)
    print("\n%s   (%d echantillons)"%(nom,n))
    print("   fond %-16s  MESURE %-16s"%(str(fond),str(mes)))
    print("   prediction sRGB     %-16s -> ecart max-canal %3d   %s"%(str(ps),dist_max(ps,mes),"<== GAGNE" if dist_max(ps,mes)<dist_max(pl,mes) else ""))
    print("   prediction LINEAIRE %-16s -> ecart max-canal %3d   %s"%(str(pl),dist_max(pl,mes),"<== GAGNE" if dist_max(pl,mes)<dist_max(ps,mes) else ""))
