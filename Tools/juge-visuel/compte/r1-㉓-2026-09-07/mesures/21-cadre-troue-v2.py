# -*- coding: utf-8 -*-
"""21 - v2 du 20 : la v1 ne prenait que s[0] et s[-1] et rendait un trou 'parfaitement centre'
sur les 7 rails -> resultat UNIFORME, donc suspect : c'etait un defaut de l'instrument.
Ici on imprime TOUS les segments et on calcule le PLUS GRAND intervalle vide.
CONTROLE POSITIF : le cadre EXTERIEUR de la meme carte doit rendre UN seul segment.
CONTROLE NEGATIF : une ligne de fond doit rendre 0 segment long."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def segs(px,y,x0=0,x1=1080,seuil=55,mini=6):
    s=[];deb=None
    for x in range(x0,x1):
        v=lum(px[x,y])>seuil
        if v and deb is None: deb=x
        if not v and deb is not None:
            if x-deb>=mini: s.append((deb,x-1))
            deb=None
    if deb is not None and x1-deb>=mini: s.append((deb,x1-1))
    return s
def rapport(px,etiq,y,x0,x1):
    s=[t for t in segs(px,y) if t[0]>=x0 and t[1]<=x1]
    if not s: print("     %-12s y=%4d  RIEN"%(etiq,y)); return
    boite=(s[0][0],s[-1][1]); larg=boite[1]-boite[0]+1
    trous=[(s[i][1]+1,s[i+1][0]-1) for i in range(len(s)-1)]
    trous=[t for t in trous if t[1]>=t[0]]
    plus=max(trous,key=lambda t:t[1]-t[0]) if trous else None
    txt=""
    if plus:
        cb=(boite[0]+boite[1])/2.0; ct=(plus[0]+plus[1])/2.0
        txt=("  PLUS GRAND TROU x=%d..%d (l=%d = %.0f %% de la boite) ; centre boite=%.0f centre trou=%.0f "
             "decentrage=%+.0f px = %+.1f %% de la largeur"
             %(plus[0],plus[1],plus[1]-plus[0]+1,100.0*(plus[1]-plus[0]+1)/larg,cb,ct,ct-cb,100*(ct-cb)/larg))
    print("     %-12s y=%4d  boite x=%d..%d (l=%d)  segments=%s%s"%(etiq,y,boite[0],boite[1],larg,s,txt))
for nom in ['../capture-1080x2400.png','../capture-planche-1080x2400.png']:
    im=ouvrir(nom); px=im.load()
    print("  --- rails HORIZONTAUX du cadre interne (bornes au cadre de carte 64..1015) ---")
    for etiq,y in [("carte1 haut",735),("carte1 bas",854),("carte2 haut",1169),("carte2 bas",1287),
                   ("carte3 haut",1602),("carte3 bas",1720),("carte4 haut",2035)]:
        rapport(px,etiq,y,60,1020)
    print("  --- CP : cadre EXTERIEUR (doit etre d'UN seul segment) ---")
    for etiq,y in [("carte1 haut",536),("carte1 bas",886),("banniere haut",353)]:
        s=segs(px,y,seuil=25)
        print("     %-14s y=%4d  segments=%s"%(etiq,y,s))
    print("  --- CN : ligne de fond y=1450 ---")
    print("     segments=",segs(px,1450,seuil=55))
    print("  --- ce qu'il y a a x=36..38 et x=1041..1043 ---")
    for y in [700,900,1200,1500,1900,2100]:
        print("     y=%4d  x=37 %s   x=1042 %s"%(y,px[37,y],px[1042,y]))
    print()
