# -*- coding: utf-8 -*-
"""Reperes: bords du chrome, filet laiton, fiche, art, dock. Echelle 1 px CSS = W/392."""
from lib import *

D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'

print("=== images ===")
K = ouvrir(D+'ecran-canon.png')
C19 = ouvrir(D+'capture-1080x1920.png')
C24 = ouvrir(D+'capture-1080x2400.png')

def echelle(im):
    return im.size[0]/392.0
print("\n=== echelle (px image par px CSS) ===")
for n,im in [('canon',K),('1080x1920',C19),('1080x2400',C24)]:
    print(f"  {n}: {echelle(im):.4f} px/CSS   (largeur {im.size[0]})")

print("\n=== CONTROLE POSITIF: rond du dock = 46 CSS attendu ===")
print("  canon attendu  : 46 * %.4f = %.1f px" % (echelle(K), 46*echelle(K)))
print("  capture attendu: 46 * %.4f = %.1f px" % (echelle(C19), 46*echelle(C19)))

def col_trans(im, x, y0, y1, seuil=14, tag=''):
    px=im.load()
    prev=None; out=[]
    for y in range(y0,y1):
        c=px[x,y]; L=lum(c)
        if prev is not None and abs(L-prev)>=seuil:
            out.append((y, px[x,y-1], c, round(L-prev,1)))
        prev=L
    print(f"  [{tag}] x={x} y {y0}..{y1} : {len(out)} transitions (seuil {seuil})")
    for t in out[:60]:
        print(f"     y={t[0]:5d}  {t[1]} -> {t[2]}  dL={t[3]}")

print("\n=== profil vertical, bord GAUCHE (x=6) ===")
col_trans(C19, 6, 0, 1920, 14, '1920 x=6')
