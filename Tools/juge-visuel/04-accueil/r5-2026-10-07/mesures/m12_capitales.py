# m12 — hauteur de CAPITALE et largeur d'encre des textes du panneau.
# Capitale isolee : on prend la 1re lettre de chaque ligne (L, S, P, U, D, B) dans une fenetre
# etroite a partir du bord gauche du texte, et on mesure son encre.
# Controle positif : la largeur du PANNEAU (987 px en ref, 986 en jeu) et le bord DROIT des boutons (979) sont deja egaux (m10).
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
def encre_bbox(px,xg,xd,y0,y1,seuil=28):
    base=med([lum(px[x,y]) for y in range(y0,y1) for x in range(xg,xd)])
    pts=[(x,y) for y in range(y0,y1) for x in range(xg,xd) if lum(px[x,y])-base>seuil]
    if not pts: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return min(xs),min(ys),max(xs),max(ys)
def ligne(im,nom,lib,xg,xd,y0,y1,xcap=None):
    px=im.load()
    b=encre_bbox(px,xg,xd,y0,y1)
    s=f'    {nom:8s} {lib:26s} encre x {b[0]}..{b[2]} (l={b[2]-b[0]+1})  y {b[1]}..{b[3]} (h={b[3]-b[1]+1})'
    if xcap:
        c=encre_bbox(px,b[0],b[0]+xcap,y0,y1)
        s+=f'   CAP h={c[3]-c[1]+1} (y {c[1]}..{c[3]})'
    print(s)
    return b
ref=charge(REF); j19=charge(J19); j24=charge(J24)
print('  LA SUITE'); 
ligne(ref,'REF','LA SUITE',430,640,865,893,None)
ligne(j19,'JEU1920','LA SUITE',430,640,790,820,None)
ligne(j24,'JEU2400','LA SUITE',430,640,1196,1226,None)
print('  TITRE 1 (Le labo attend du Pyralin) — capitale L')
ligne(ref,'REF','titre1',95,600,940,1000,26)
ligne(j19,'JEU1920','titre1',90,600,862,912,26)
ligne(j24,'JEU2400','titre1',90,600,1268,1318,26)
print('  SOUS-LIGNE 1 (Sans lui, rien ne cuit.) — capitale S')
ligne(ref,'REF','sous1',95,600,1002,1036,22)
ligne(j19,'JEU1920','sous1',90,600,922,960,22)
ligne(j24,'JEU2400','sous1',90,600,1328,1366,22)
print('  TITRE 2 (Personne ne vend...) — capitale P')
ligne(ref,'REF','titre2 l.1',95,600,1110,1150,26)
ligne(j19,'JEU1920','titre2',90,600,1030,1068,26)
ligne(j24,'JEU2400','titre2',90,600,1437,1475,26)
print('  TITRE 3 (De l argent...) — capitale D')
ligne(ref,'REF','titre3 l.1',95,600,1370,1420,26)
ligne(j19,'JEU1920','titre3 l.1',90,600,1234,1280,26)
ligne(j24,'JEU2400','titre3 l.1',90,600,1641,1687,26)
print('  SOUS-LIGNE 3 (Blanchissez-le...) — capitale B')
ligne(ref,'REF','sous3 l.1',95,600,1480,1520,22)
ligne(j19,'JEU1920','sous3 l.1',90,600,1336,1376,22)
ligne(j24,'JEU2400','sous3 l.1',90,600,1743,1783,22)
