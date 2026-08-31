# -*- coding: utf-8 -*-
"""05 — GÉOMÉTRIE HORIZONTALE : bords gauche/droite de chaque bloc, en px CSS depuis le bord
gauche du cerne. Méthode : marches de luminance le long d'une ligne choisie dans le bloc.
Contrôle positif : le bord droit du cerne doit tomber à 290 px CSS des deux côtés (300 - 2x5).
Contrôle négatif : le bord droit du cadre .prt doit tomber au même endroit alors que les deux
images n'ont pas la même largeur en px (422 px vs 495 px) — si l'instrument rendait les mêmes
PIXELS, il ne normaliserait pas."""
from PIL import Image
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]
def marches(im,y,x0,x1,s=8):
    px=im.load(); L=[lum(px[x,y]) for x in range(x0,x1)]; o=[]
    for i in range(1,len(L)):
        d=L[i]-L[i-1]
        if abs(d)>s: o.append((x0+i,round(d,1)))
    return o
CAS=[('REF','/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png',3.0,18,
      [('enseigne',420),('compteurs (fenetres)',620),('.elast + .prt + tuile2',960),('.pann',1470),('.cta6',1690)]),
     ('CAP','/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',3.6,18,
      [('enseigne',60),('compteurs (fenetres)',300),('.elast + .prt + tuile2',690),('.pann',1425),('.cta6',1770)])]
for nom,path,sc,cx0,lignes in CAS:
    im=Image.open(path).convert('RGB'); print('='*76); print(nom,path.split('/')[-1],im.size)
    W=im.size[0]
    for lib,y in lignes:
        m=marches(im,y,cx0,W-cx0)
        print(' %-24s y=%-5d :'%(lib,y), ' '.join('%.1f(%+.0f)'%((x-cx0)/sc,d) for x,d in m))
