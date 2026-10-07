# m14 — largeur d'ENCRE de chaque ligne de texte (echelle horizontale 1:1 : 1080 px des deux cotes).
# Fenetre elargie a x<=700 (bord gauche du bouton le plus a gauche : 605 ref / 636 jeu pour B2,
# 705/729 pour B3) : chaque ligne est mesuree dans une fenetre qui ne touche AUCUN bouton.
# La reference porte un souligne pointille d'atelier : il est exclu en coupant la bande d'encre
# au premier creux (cf. m13).
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
def larg(im,nom,lib,xg,xd,y0,y1,seuil=28):
    px=im.load()
    base=med([lum(px[x,y]) for y in range(y0,y1) for x in range(xg,xd)])
    pts=[(x,y) for y in range(y0,y1) for x in range(xg,xd) if lum(px[x,y])-base>seuil]
    xs=[p[0] for p in pts]
    print(f'    {nom:8s} {lib:22s} x {min(xs)}..{max(xs)}  largeur={max(xs)-min(xs)+1}  (fenetre x{xg}..{xd} y{y0}..{y1})')
    return max(xs)-min(xs)+1
ref=charge(REF); j19=charge(J19); j24=charge(J24)
jeux={
 # lib : (ref window, j1920 window, j2400 window)   y bornes = bloc de glyphes SEUL (pas le souligne)
 'titre1':((95,700,946,978),(90,700,868,898),(90,700,1274,1305)),
 'sous1' :((95,700,1005,1032),(90,700,926,954),(90,700,1332,1360)),
 'titre2 l1':((95,600,1115,1147),(90,700,1034,1065),(90,700,1441,1471)),
 'sous2 l1':((95,600,1264,1300),(90,700,1130,1164),(90,700,1536,1571)),
 'titre3 l1':((95,700,1374,1406),(90,700,1238,1269),(90,700,1645,1675)),
 'sous3 l1':((95,700,1483,1510),(90,700,1340,1367),(90,700,1747,1774)),
}
for lib,(a,b,c) in jeux.items():
    larg(ref,'REF',lib,*a); larg(j19,'JEU1920',lib,*b); larg(j24,'JEU2400',lib,*c); print()
