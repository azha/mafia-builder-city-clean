# -*- coding: utf-8 -*-
"""03 - Le cadre interne 'DERRIERE LA VITRE' : ou est le trait, ou manque-t-il ?
Methode : sur la bande du rail HAUT (et BAS, et les deux montants), compter par colonne (resp. ligne)
le maximum de luminance ; un trait present depasse le fond de facon nette.
Controle POSITIF : le rail BAS de la meme boite doit etre CONTINU sur la meme mesure (sinon
l'instrument ne discrimine pas). Controle NEGATIF : une bande VIDE (plein interieur) doit rendre 0 %."""
from PIL import Image
import os
im = Image.open('../capture-1080x2400.png').convert('RGB')
print("ouvert capture-1080x2400.png", im.size)
px = im.load()

def L(x,y):
    r,g,b = px[x,y]; return 0.2126*r+0.7152*g+0.0722*b

def bande_h(y0,y1,x0,x1,seuil):
    """pour chaque colonne, max de luminance sur [y0,y1) -> present si > seuil"""
    pres=[]
    for x in range(x0,x1):
        m = max(L(x,y) for y in range(y0,y1))
        pres.append(m>seuil)
    return pres

def bande_v(x0,x1,y0,y1,seuil):
    pres=[]
    for y in range(y0,y1):
        m = max(L(x,y) for x in range(x0,x1))
        pres.append(m>seuil)
    return pres

def segments(pres, off):
    segs=[]; deb=None
    for i,v in enumerate(pres):
        if v and deb is None: deb=i
        if not v and deb is not None:
            segs.append((deb+off, i-1+off)); deb=None
    if deb is not None: segs.append((deb+off, len(pres)-1+off))
    return segs

def rapport(nom, pres, off):
    segs=segments(pres,off)
    segs=[s for s in segs if s[1]-s[0]>=2]
    tot=len(pres); plein=sum(1 for v in pres if v)
    print("  %-16s couverture %3d/%3d = %5.1f %%   segments: %s" %
          (nom, plein, tot, 100.0*plein/tot, segs))
    return segs

# boite 1 (carte 'Pack - 100 Marks'), reperes lus sur c-encadre-zoom.png
# rail haut ~y=735 ; bas ~y=847 ; gauche x~73 ; droite x~1013
print("--- boite 1 : DERRIERE LA VITRE (carte Pack 100) ---")
h_haut = rapport("rail HAUT",   bande_h(731,741, 95, 995, 45), 95)
h_bas  = rapport("rail BAS  (CP)", bande_h(843,853, 95, 995, 45), 95)
v_g    = rapport("montant G", bande_v(70,80, 750,835, 45), 750)
v_d    = rapport("montant D", bande_v(1008,1018, 750,835, 45), 750)
print("  CONTROLE NEGATIF  bande vide (interieur y=790..800, hors texte x=95..250) :")
rapport("  interieur", bande_h(700,710, 200, 900, 45), 200)

# meme boite sur les 3 autres cartes -> la meme geometrie doit se repeter
for k,(yh,yb,yg,yd) in enumerate([(1163,1275,750,835),(1596,1708,750,835)]):
    pass
