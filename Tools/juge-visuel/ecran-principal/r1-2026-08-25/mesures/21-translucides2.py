# -*- coding: utf-8 -*-
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def M(im,x0,y0,x1,y1,tag):
    c=med(im,x0,y0,x1,y1); print(f"    {tag:52s} {c}  L={lum(c):6.1f}"); return c
print("\n### plaque de reference : DANS la fiche, hors bouton, meme rangee ###")
kp=M(K,48,1650,84,1730,'canon plaque (x48..83, a gauche du bouton or)')
kb=M(K,470,1660,520,1700,'canon interieur BLANCHIR')
kbd=M(K,431,1650,433,1730,'canon bordure BLANCHIR (x431..432)')
print(f"      interieur - plaque : {lum(kb)-lum(kp):+.1f} L      bordure - plaque : {lum(kbd)-lum(kp):+.1f} L")
cp=M(C,45,1450,74,1530,'c19 plaque (x45..73, a gauche du bouton or)')
cb=M(C,410,1470,450,1500,'c19 interieur BLANCHIR')
cbd=M(C,395,1450,398,1530,'c19 bordure BLANCHIR (x395..397)')
print(f"      interieur - plaque : {lum(cb)-lum(cp):+.1f} L      bordure - plaque : {lum(cbd)-lum(cp):+.1f} L")
print(f"      RAPPORT capture/canon : interieur x{(lum(cb)-lum(cp))/(lum(kb)-lum(kp)):.2f}   bordure x{(lum(cbd)-lum(cp))/(lum(kbd)-lum(kp)):.2f}")
print("\n### CONTROLE POSITIF du meme instrument : le bouton OR (opaque) ###")
ko=M(K,150,1650,250,1700,'canon interieur COLLECTER'); co=M(C,130,1460,230,1510,'c19 interieur COLLECTER')
print(f"      ecart canon->capture sur une surface OPAQUE : dL={lum(co)-lum(ko):+.1f} (doit etre ~0)")
