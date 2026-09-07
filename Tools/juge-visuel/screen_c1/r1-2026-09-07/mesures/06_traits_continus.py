#!/usr/bin/env python3
"""Distingue un FILET (trait continu) d'une RANGEE DE TEXTE : on mesure le plus long
RUN contigu de pixels non-fond sur la rangee. Un filet = run > 60% de la largeur.
Deux familles : chaud (laiton/or) et froid (#2a3648, bordures de boitiers).
Controle positif chaud : reference y=641 (filet de l'enseigne) -> run long.
Controle NEGATIF chaud : reference y=1236 (rangee de TEXTE) -> run court.
Controle positif froid : reference y=1185 (bord haut d'une breve) -> run long."""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def chaud(p): return (p[0]-p[2])>20 and lum(p)>45
FROID=(42,54,72)
def froid(p): return all(abs(p[i]-FROID[i])<=22 for i in range(3))

def runs(px,W,y,pred):
    best=cur=0
    for x in range(W):
        cur = cur+1 if pred(px[x,y]) else 0
        best=max(best,cur)
    return best

def analyse(f, familles=('chaud','froid')):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    print(f"=== {f}  taille={W}x{H} ===")
    for nom,pred in (('CHAUD',chaud),('FROID',froid)):
        if nom.lower() not in familles: continue
        trouve=[]
        for y in range(H):
            r=runs(px,W,y,pred)
            if r>0.60*W: trouve.append((y,r))
        grp,prev=[],None
        for y,r in trouve:
            if prev is None or y!=prev+1: grp.append([y,y,r])
            else: grp[-1][1]=y; grp[-1][2]=max(grp[-1][2],r)
            prev=y
        print(f"  TRAITS CONTINUS {nom} (run>{int(0.60*W)}px) : {len(grp)} groupe(s)")
        for a,b,r in grp: print(f"    y={a}-{b} ({b-a+1}px) run max {r}px")
    return im,px,W,H

im,px,W,H = analyse('reference-1080x2102.png')
print(f"  CONTROLE POSITIF chaud  y=641 run={runs(px,W,641,chaud)} (attendu >600) "
      f"-> {'OK' if runs(px,W,641,chaud)>600 else 'ECHEC'}")
print(f"  CONTROLE NEGATIF chaud  y=1236 (texte) run={runs(px,W,1236,chaud)} (attendu <120) "
      f"-> {'OK' if runs(px,W,1236,chaud)<120 else 'ECHEC'}")
print(f"  CONTROLE POSITIF froid  y=1185 run={runs(px,W,1185,froid)} (attendu >600) "
      f"-> {'OK' if runs(px,W,1185,froid)>600 else 'ECHEC'}")
print()
for f in ['capture-1080x2400.png','capture-ecran-seul-1080x2400.png','capture-ecran-seul-1080x1920.png']:
    analyse(f); print()
