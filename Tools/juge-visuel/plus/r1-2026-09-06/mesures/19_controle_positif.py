#!/usr/bin/env python3
"""Contrôle positif : ce que l'instrument trouve REGULIER / EGAL dans la capture.
Reprend les segments du 04 (rangees) et mesure pas, hauteur, gouttiere ; plus la marque
d'onglet actif du dock et le centrage des libelles.
Controle negatif : l'ecart-type du pas doit etre >0 si les rangees ne sont PAS regulieres
(ici on attend un ecart-type tres faible : c'est le resultat, pas l'hypothese)."""
import os, statistics
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(D,'capture-1080x2400.png')
im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
print(f"ouvre {os.path.basename(p)} taille={im.size}")
R=[(144,251),(266,374),(389,497),(512,619),(634,742),(757,865),(879,987),(1002,1110),(1125,1233),
   (1247,1355),(1370,1478),(1493,1600),(1615,1723),(1738,1846),(1860,1968),(1983,2091),(2106,2214),(2228,2336)]
h=[b-a+1 for a,b in R]; pas=[R[i+1][0]-R[i][0] for i in range(len(R)-1)]
g=[R[i+1][0]-R[i][1]-1 for i in range(len(R)-1)]
print(f"  rangees detectees            : {len(R)}")
print(f"  hauteur de rangee            : min {min(h)} max {max(h)} moy {sum(h)/len(h):.2f} ecart-type {statistics.pstdev(h):.2f} px")
print(f"  pas vertical                 : min {min(pas)} max {max(pas)} moy {sum(pas)/len(pas):.2f} ecart-type {statistics.pstdev(pas):.2f} px")
print(f"  gouttiere entre rangees      : min {min(g)} max {max(g)} moy {sum(g)/len(g):.2f} px")
def Lu(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
cx=[]
for a,b in R[1:16]:
    pts=[(x,y) for y in range(a,b) for x in range(W) if Lu(px[x,y])>95 and (px[x,y][0]-px[x,y][2])>20]
    if pts: cx.append(((min(q[0] for q in pts)+max(q[0] for q in pts))/2))
print(f"  centre x des libelles        : min {min(cx):.1f} max {max(cx):.1f} (centre ecran 540) ecart max {max(abs(v-540) for v in cx):.1f} px")
# onglet actif : trait or sous une pastille
orpts=[(x,y) for y in range(2305,2330) for x in range(W) if (px[x,y][0]-px[x,y][2])>60 and Lu(px[x,y])>90]
if orpts:
    xs=[q[0] for q in orpts]
    print(f"  marque d'onglet actif (trait or) : x {min(xs)}..{max(xs)} y {min(q[1] for q in orpts)}..{max(q[1] for q in orpts)}")
    print(f"     centres des 4 pastilles ~ 258 / 446 / 634 / 821  -> marque sous la pastille n°{1+round((( min(xs)+max(xs))/2 - 258)/187.5)}")
