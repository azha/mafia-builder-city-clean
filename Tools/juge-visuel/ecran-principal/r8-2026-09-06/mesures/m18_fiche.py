# -*- coding: utf-8 -*-
"""m18 - la fiche : plaque (boite, coin arrondi, filet superieur), titre, sous-titre, separateurs,
boutons, et le RETRAIT DE COIN du remplissage de COLLECTER (le defaut M1 du r7).
Le canon place `.fiche` a (13.00 ; 424.52) 366.00 x 169.19 (mesure-canon.txt, au navigateur).
La capture 1080x1920 est en correspondance CSS 1:1 avec la reference (392 CSS de large, hauteur
1920/2.7551 = 696.9 CSS ~ 696.88 du `.tel`) ; a 1080x2400 la fiche est ancree au dock, plus bas."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
print("=== m18 : la fiche ===")

def bord_plaque(cle, ybande, xdeb=0.0, xfin=392.0):
    """detecte les bords gauche/droit de la plaque sur une ligne : saut de luminance."""
    im,f=ouvrir(cle,taire=True); px=im.load()
    yi=int(ybande*f)
    ls=[(xx/f, L(px[xx,yi])) for xx in range(int(xdeb*f),int(xfin*f))]
    return ls

for cle,ytop in [('canon',None),('j1920',None),('j2400',None)]:
    im,f=ouvrir(cle); px=im.load(); W,H=im.size
    # ligne du haut de la plaque : le filet `.fiche::after` (laiton) est a y = top de la fiche
    best=None
    for yy in range(int(380*f),int(640*f)):
        n=sum(1 for xx in range(int(30*f),int(360*f),2) if (px[xx,yy][0]-px[xx,yy][2])>=45 and px[xx,yy][0]>=110)
        if best is None or n>best[1]: best=(yy/f,n)
    ytop,n=best
    # bords g/d de la plaque : 20 CSS sous le filet, saut de L
    ls=bord_plaque(cle, ytop+22)
    # cherche la plus grande chute/hausse
    dl=[(ls[k][0], ls[k+1][1]-ls[k][1]) for k in range(len(ls)-1)]
    g=min(dl[:len(dl)//2], key=lambda t:t[1]); d=max(dl[len(dl)//2:], key=lambda t:t[1])
    # bas de la plaque : colonne au centre, saut de L
    xi=int(196*f); col=[(j/f,L(px[xi,j])) for j in range(int(ytop*f),min(H,int((ytop+230)*f)))]
    dc=[(col[k][0], col[k+1][1]-col[k][1]) for k in range(len(col)-1)]
    bas=max(dc[int(len(dc)*0.5):], key=lambda t:t[1])
    print("\n-- %s : filet sup. de la fiche y=%.2f (%d colonnes) ; bords x %.2f / %.2f (largeur %.2f) ; bas y=%.2f (hauteur %.2f)"
          %(cle,ytop,n,g[0],d[0],d[0]-g[0],bas[0],bas[0]-ytop))
    # coin arrondi : retrait du bord gauche sur les 14 premieres lignes
    ret=[]
    for k in range(0,14):
        yy=int((ytop+0.4+k/f)*f)
        ll=[(xx/f,L(px[xx,yy])) for xx in range(int(5*f),int(60*f))]
        dd=[(ll[t][0], ll[t+1][1]-ll[t][1]) for t in range(len(ll)-1)]
        m=min(dd,key=lambda t:t[1]) if cle=='canon' else max(dd,key=lambda t:abs(t[1]))
        ret.append(m[0]-g[0])
    print("   retrait du coin haut-gauche (14 lignes, CSS) : %s"%(" ".join("%.2f"%r for r in ret)))
