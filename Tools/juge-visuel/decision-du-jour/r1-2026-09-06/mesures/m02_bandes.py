#!/usr/bin/env python3
"""m02 - frontieres exactes : chrome haut, chrome bas, region PLATE (vide), bbox de l'encre.
Controle positif : la region plate doit avoir 1 seule couleur (compte de teintes == 1).
Controle negatif : la meme mesure sur une bande de la reference doit rendre >> 1 teinte.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, 'reference-1080x2102.png')
CAP = os.path.join(D, 'capture-1080x2400.png')

def charge(p, l):
    im = Image.open(p).convert('RGB'); print(f"[{l}] {os.path.basename(p)} {im.size[0]}x{im.size[1]}")
    return im

def teintes_bande(im, y0, y1, pas=2):
    px = im.load(); W = im.size[0]; s = set()
    for y in range(y0, y1, pas):
        for x in range(0, W, pas):
            s.add(px[x, y])
    return s

cap = charge(CAP, 'CAP'); ref = charge(REF, 'REF')

# --- capture : trouver la plus longue plage de lignes STRICTEMENT uniformes
px = cap.load(); W, H = cap.size
uni = []
for y in range(H):
    c0 = px[0, y]; u = True
    for x in range(0, W, 3):
        if px[x, y] != c0: u = False; break
    uni.append((u, c0))
best = None; cur = None
for y in range(H):
    if uni[y][0]:
        if cur is None: cur = [y, y, uni[y][1]]
        else: cur[1] = y
    else:
        if cur and (best is None or cur[1]-cur[0] > best[1]-best[0]): best = cur
        cur = None
if cur and (best is None or cur[1]-cur[0] > best[1]-best[0]): best = cur
print(f"[CAP] plus longue plage de lignes UNIFORMES : y={best[0]}..{best[1]}  ({best[1]-best[0]+1} lignes)  couleur={best[2]}")

s = teintes_bande(cap, best[0], best[1]+1)
print(f"[CAP] CONTROLE POSITIF teintes distinctes dans cette plage = {len(s)} (attendu 1) -> {'OK' if len(s)==1 else 'ECHEC'}")
sn = teintes_bande(ref, 400, 700)
print(f"[REF] CONTROLE NEGATIF teintes distinctes y=400..700 (l'art peint) = {len(sn)} (doit etre >> 1) -> {'OK' if len(sn)>100 else 'ECHEC'}")

# --- meme mesure de plage uniforme sur la reference
pr = ref.load(); Wr, Hr = ref.size
unir = []
for y in range(Hr):
    c0 = pr[0, y]; u = True
    for x in range(0, Wr, 3):
        if pr[x, y] != c0: u = False; break
    unir.append(u)
bestr = None; cur = None
for y in range(Hr):
    if unir[y]:
        if cur is None: cur = [y, y]
        else: cur[1] = y
    else:
        if cur and (bestr is None or cur[1]-cur[0] > bestr[1]-bestr[0]): bestr = cur
        cur = None
if cur and (bestr is None or cur[1]-cur[0] > bestr[1]-bestr[0]): bestr = cur
print(f"[REF] plus longue plage de lignes UNIFORMES : y={bestr[0]}..{bestr[1]}  ({bestr[1]-bestr[0]+1} lignes)")
