# m13 — hauteur de capitale PROPRE : profil d'encre ligne par ligne sur la 1re lettre.
# La reference porte un SOULIGNE POINTILLE d'atelier (class="prop" = contenu PROPOSE,
# `.acc4 .prop{text-decoration:underline dotted #b9ad92;text-underline-offset:2px}`) :
# il se detache du glyphe par >=1 ligne vide, on l'ecarte en coupant a la premiere ligne vide
# apres le debut de l'encre.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
def profil(im,nom,lib,xg,xd,y0,y1,seuil=28):
    px=im.load()
    base=med([lum(px[x,y]) for y in range(y0,y1) for x in range(xg,xd)])
    rows=[(y,sum(1 for x in range(xg,xd) if lum(px[x,y])-base>seuil)) for y in range(y0,y1)]
    s=''.join('#' if n>0 else '.' for y,n in rows)
    # premier bloc continu d'encre
    i=s.find('#')
    j=s.find('.',i) if i>=0 else -1
    h=(j-i) if j>0 else None
    print(f'    {nom:8s} {lib:14s} y{y0}..{y1} profil={s}  -> 1er bloc y {y0+i}..{y0+j-1} h={h}')
    return h
ref=charge(REF); j19=charge(J19); j24=charge(J24)
for lib,(a,b,c) in {
 'titre1 L':((99,125,940,1005),(98,124,862,925),(98,124,1268,1331)),
 'sous1 S':((101,123,1000,1045),(98,120,920,968),(98,120,1326,1374)),
 'titre2 P':((101,127,1108,1160),(98,124,1028,1078),(98,124,1435,1485)),
 'titre3 D':((99,127,1368,1425),(98,126,1232,1288),(98,126,1639,1695)),
 'sous3 B':((99,121,1478,1525),(99,121,1335,1382),(99,121,1742,1789)),
}.items():
    profil(ref,'REF',lib,*a); profil(j19,'JEU1920',lib,*b); profil(j24,'JEU2400',lib,*c); print()
