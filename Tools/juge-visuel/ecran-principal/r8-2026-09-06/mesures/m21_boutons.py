# -*- coding: utf-8 -*-
"""m21 - boutons de la fiche : boite du bouton OR (COLLECTER) et RETRAIT DE COIN de son
remplissage (defaut M1 du r7 : remplissage a angles droits sous un trace arrondi).
Le remplissage or se detecte par (R-B) >= 70 et R >= 150 -- controle : la meme regle doit
rendre ~0 px sur les boutons secondaires (.btn.ligne, fond #ffffff0a)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
def est_or(c):
    return (c[0]-c[2])>=70 and c[0]>=150 and c[1]>=110

print("=== m21 : bouton COLLECTER ===")
BANDE={'canon':(530.0,585.0),'j1920':(530.0,585.0),'j2400':(705.0,760.0)}
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); px=im.load()
    y0,y1=BANDE[cle]
    lignes={}
    for yy in range(int(y0*f),int(y1*f)):
        xs=[xx for xx in range(int(20*f),int(200*f)) if est_or(px[xx,yy])]
        if len(xs)>int(40*f): lignes[yy]=(min(xs),max(xs),len(xs))
    if not lignes: print("   %s : bouton or introuvable"%cle); continue
    ys=sorted(lignes)
    bx0=min(l[0] for l in lignes.values()); bx1=max(l[1] for l in lignes.values())
    print("\n-- %s : bouton OR  x %.2f..%.2f (%.2f CSS)  y %.2f..%.2f (%.2f CSS)"
          %(cle,bx0/f,bx1/f,(bx1-bx0+1)/f,ys[0]/f,ys[-1]/f,(ys[-1]-ys[0]+1)/f))
    h=[(lignes[y][0]-bx0)/f for y in ys[:10]]
    b=[(lignes[y][0]-bx0)/f for y in ys[-10:]]
    hd=[(bx1-lignes[y][1])/f for y in ys[:10]]
    print("   retrait GAUCHE du REMPLISSAGE, 10 premieres lignes : %s"%(" ".join("%.2f"%v for v in h)))
    print("   retrait DROIT  du REMPLISSAGE, 10 premieres lignes : %s"%(" ".join("%.2f"%v for v in hd)))
    print("   retrait GAUCHE du REMPLISSAGE, 10 dernieres lignes : %s"%(" ".join("%.2f"%v for v in b)))
    # controle : la meme regle sur la zone du bouton BLANCHIR
    n=0
    for yy in range(ys[0],ys[-1]):
        for xx in range(int(160*f),int(270*f)):
            if est_or(px[xx,yy]): n+=1
    print("   [controle] pixels 'or' dans la zone BLANCHIR (x 160..270) : %d"%n)
    # degrade vertical du remplissage (canon #e9c56b -> #c99a37)
    xm=int(((bx0+bx1)/2))
    ech=[(j/f,px[xm,j]) for j in range(ys[0],ys[-1]+1, max(1,(ys[-1]-ys[0])//6))]
    print("   degrade vertical au centre : %s"%("  ".join("%.1f:%s"%(y,c) for y,c in ech)))
