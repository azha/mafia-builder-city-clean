#!/usr/bin/env python3
"""m08 - etendue horizontale des grands blocs, pour poser l'echelle sur une grandeur PARTAGEE.
On mesure, sur des lignes choisies dans chaque bloc, le premier et le dernier px 'encre'.
REF : fond = art peint -> encre = px s'ecartant du fond de la ligne (median des bords).
CAP : fond = (13,13,13).
Controle positif : la largeur du bandeau doit valoir 1080 des deux cotes.
"""
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def bornes(im, y, fond, seuil=10):
    px=im.load(); W=im.size[0]
    def d(p): return max(abs(p[0]-fond[0]),abs(p[1]-fond[1]),abs(p[2]-fond[2]))
    xs=[x for x in range(W) if d(px[x,y])>seuil]
    return (min(xs),max(xs),len(xs)) if xs else None

ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size[0]}x{ref.size[1]}   [CAP] {cap.size[0]}x{cap.size[1]}")

print("\n-- CAP (fond 13,13,13) : bornes par ligne --")
for y in [1290, 1350, 1450, 1550, 1650, 1700, 1740, 1790, 1860, 1935, 1990, 2050, 2120]:
    b = bornes(cap, y, (13,13,13))
    print(f"   y={y:5d}  x={b[0]:4d}..{b[1]:4d}  largeur={b[1]-b[0]+1:5d}  n_encre={b[2]:5d}" if b else f"   y={y:5d}  RIEN")

print("\n-- REF : bornes par ligne (fond = px a x=5 de la meme ligne) --")
pr=ref.load()
for y in [800, 900, 1100, 1300, 1400, 1500, 1560, 1600, 1660, 1700, 1795, 1830, 1900, 2000, 2050]:
    fond = pr[5,y]
    b = bornes(ref, y, fond, 18)
    print(f"   y={y:5d}  fond={str(fond):15s} x={b[0]:4d}..{b[1]:4d}  largeur={b[1]-b[0]+1:5d}  n={b[2]:5d}" if b else f"   y={y:5d}  fond={fond} RIEN")
