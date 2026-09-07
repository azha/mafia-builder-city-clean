# -*- coding: utf-8 -*-
"""20 - Le cadre 'DERRIERE LA VITRE' : bbox exacte, position et symetrie du trou, sur les
4 cartes et sur les DEUX captures. Le trait vaut L=119 sur un fond L=13 : seuil a 55.
CONTROLE POSITIF : le cadre EXTERIEUR de la meme carte, mesure par la meme sonde, doit sortir
CONTINU sur toute sa largeur -> la sonde sait voir un trait complet.
CONTROLE NEGATIF : une ligne de fond doit sortir vide."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def segs(px,y,x0=0,x1=1080,seuil=55,mini=3):
    s=[];deb=None
    for x in range(x0,x1):
        v=lum(px[x,y])>seuil
        if v and deb is None: deb=x
        if not v and deb is not None:
            if x-deb>=mini: s.append((deb,x-1))
            deb=None
    if deb is not None and x1-deb>=mini: s.append((deb,x1-1))
    return s
def segsv(px,x,y0,y1,seuil=55,mini=3):
    s=[];deb=None
    for y in range(y0,y1):
        v=lum(px[x,y])>seuil
        if v and deb is None: deb=y
        if not v and deb is not None:
            if y-deb>=mini: s.append((deb,y-1))
            deb=None
    if deb is not None and y1-deb>=mini: s.append((deb,y1-1))
    return s
for nom in ['../capture-1080x2400.png','../capture-planche-1080x2400.png']:
    im=ouvrir(nom); px=im.load()
    print("  --- rails HORIZONTAUX du cadre interne (4 cartes) ---")
    for etiq,y in [("carte1 haut",735),("carte1 bas",854),("carte2 haut",1169),("carte2 bas",1287),
                   ("carte3 haut",1602),("carte3 bas",1720),("carte4 haut",2035)]:
        s=segs(px,y)
        if not s: print("     %-12s y=%4d  RIEN"%(etiq,y)); continue
        g0,g1 = s[0][1]+1, s[-1][0]-1
        boite=(s[0][0], s[-1][1])
        larg=boite[1]-boite[0]+1
        centre_boite=(boite[0]+boite[1])/2.0
        centre_trou=(g0+g1)/2.0
        print("     %-12s y=%4d  boite x=%d..%d (l=%d)  trou x=%d..%d (l=%d)  centre boite=%.0f  centre trou=%.0f  decentrage=%+.0f px = %+.0f %% de la largeur"
              %(etiq,y,boite[0],boite[1],larg,g0,g1,g1-g0+1,centre_boite,centre_trou,centre_trou-centre_boite,100*(centre_trou-centre_boite)/larg))
    print("  --- montants VERTICAUX, carte 1 ---")
    for etiq,x in [("gauche",74),("droite",1011)]:
        print("     %-8s x=%4d  segments y=%s"%(etiq,x,segsv(px,x,725,865)))
    print("  --- CP : cadre EXTERIEUR de la carte 1 (y=536 et y=886) ---")
    print("     y=536 :",segs(px,536,seuil=25))
    print("     y=886 :",segs(px,886,seuil=25))
    print("  --- CP : cadre de la banniere (y=353) ---")
    print("     y=353 :",segs(px,353,seuil=25))
    print("  --- CN : ligne de fond (y=700) ---")
    print("     y=700 :",segs(px,700,seuil=55))
    print()
