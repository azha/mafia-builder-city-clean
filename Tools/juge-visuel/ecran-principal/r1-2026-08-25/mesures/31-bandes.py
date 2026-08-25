# -*- coding: utf-8 -*-
"""Couche globale RESTREINTE AU CHROME (l'art differe: canon=nuit, capture=jour -> non comparable)."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
def bande(im,x0,x1,y0,y1,tag):
    px=im.load(); n=0; s=0; enc=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            L=lum(px[x,y]); s+=L; n+=1
            if L>90: enc+=1
    print(f"  [{tag}] y {y0}..{y1} : L moyenne={s/n:6.1f}   densite d'encre (L>90) = {100.0*enc/n:5.2f}%")
print("### BANDEAU HAUT ###")
bande(K,0,1176,3,153,'canon barre (0..392 CSS x 1..51 CSS)')
bande(C,0,1080,0,129,'c19 barre')
bande(C2,0,1080,0,129,'c24 barre')
print("### FICHE ###")
bande(K,39,1137,1277,1784,'canon fiche')
bande(C,33,1047,1188,1654,'c19 fiche')
bande(C2,33,1047,1668,2134,'c24 fiche')
print("### DOCK ###")
bande(K,3,1173,1817,2085,'canon dock')
bande(C,0,1080,1654,1920,'c19 dock')
bande(C2,0,1080,2133,2400,'c24 dock')
print("\n### les DEUX captures ont-elles le meme chrome ? (bandeau: comparaison octet) ###")
p1=C.load(); p2=C2.load()
diff=0; n=0
for y in range(0,200):
    for x in range(0,1080):
        n+=1
        if p1[x,y]!=p2[x,y]: diff+=1
print(f"  bandeau y 0..200 : {diff} pixels differents sur {n} ({100.0*diff/n:.3f}%)")
diff=0;n=0
for y in range(0,466):
    for x in range(33,1047):
        n+=1
        if p1[x,1188+y]!=p2[x,1668+y]: diff+=1
print(f"  fiche (1920 y1188.. vs 2400 y1668..) : {diff} pixels differents sur {n} ({100.0*diff/n:.3f}%)")
print("\n### RYTHME VERTICAL (frontieres, en CSS depuis le haut) ###")
print("  canon  : barre 0..50,7 | filet 51,3 | alerte 78..89,3 | fiche 425,7..594,3 | dock 605,7..696")
print("  c19    : barre 0..46,8 | filet 47,5 | Verge-A 62..68 | art 87..431 | fiche 431,2..600,1 | teal/dock 600,4..697")
print("  c24 (a 871,2 CSS de haut) : barre 0..46,8 | filet 47,5 | Verge-A 62..68 | vide 78,4..174 | art 174..605 | fiche 605,4..774,4 | dock 774,4..871")
