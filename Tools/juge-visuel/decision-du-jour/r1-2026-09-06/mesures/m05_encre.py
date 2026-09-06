#!/usr/bin/env python3
"""m05 - carte d'encre : pour chaque ligne, combien de px s'ecartent du fond local.
CAP : le fond est l'aplat (13,13,13) mesure en m02. REF : pas de fond uniforme (art peint).
But : delimiter le rect occupe par le CONTENU dans la capture, et le comparer au rect libre.
Controle positif : la ligne du filet or du bandeau (y=140) doit etre 'encree' sur toute la largeur.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); W,H = im.size
print(f"[CAP] capture-1080x2400.png {W}x{H}")
px = im.load()
FOND = (13,13,13)
def diff(p): return max(abs(p[0]-FOND[0]),abs(p[1]-FOND[1]),abs(p[2]-FOND[2]))

lignes=[]
for y in range(H):
    n = sum(1 for x in range(W) if diff(px[x,y])>6)
    lignes.append(n)
print(f"[CAP] CONTROLE POSITIF y=140 (filet or du bandeau) encre sur {lignes[140]} px / {W} -> {'OK' if lignes[140]>900 else 'ECHEC'}")

# plages encrees (>=1% de la largeur)
seuil = W*0.01
runs=[]; cur=None
for y in range(H):
    if lignes[y] >= seuil:
        if cur is None: cur=[y,y]
        else: cur[1]=y
    else:
        if cur: runs.append(tuple(cur)); cur=None
if cur: runs.append(tuple(cur))
print(f"[CAP] plages encrees (>= {seuil:.0f} px sur la ligne) :")
for a,b in runs:
    print(f"   y={a:5d}..{b:5d}  h={b-a+1:5d}")
# trous
print(f"[CAP] TROUS entre plages :")
for i in range(len(runs)-1):
    a=runs[i][1]; b=runs[i+1][0]
    print(f"   vide y={a+1:5d}..{b-1:5d}  h={b-a-1:5d} px  ({(b-a-1)/H*100:.1f}% de la hauteur)")
