#!/usr/bin/env python3
"""Le filet haut de .sv-bas (border-top:2px solid #2c3640) existe-t-il dans la CAPTURE ?
Balayage EXHAUSTIF de toute la colonne (mediane 1px x 121px de large, x=600..720, hors texte),
on cherche toute ligne dont la couleur approche #2c3640 (ecart <= 12).
Controle positif : le meme balayage sur la REFERENCE doit TROUVER le filet (>=1 ligne).
Controle negatif : un motif absurde (#00ff00) ne doit rien trouver dans aucune des deux."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def bande(px,y,x0,x1):
    vs=[px[x,y] for x in range(x0,x1)]
    vs.sort(key=lambda p:0.2126*p[0]+0.7152*p[1]+0.0722*p[2]); return vs[len(vs)//2]
def d(a,b): return max(abs(a[i]-b[i]) for i in range(3))
def H(s): return tuple(int(s[i:i+2],16) for i in (1,3,5))
def cherche(path,cible,tol,y0,y1,tag):
    im=Image.open(path).convert("RGB"); px=im.load()
    print(f"[{tag}] {path.split('/')[-1]} {im.size[0]}x{im.size[1]}  cible={cible} tol={tol} bande y=[{y0},{y1})")
    hits=[y for y in range(y0,y1) if d(bande(px,y,600,720),H(cible))<=tol]
    if not hits: print("   AUCUNE ligne"); return []
    runs=[];cur=[hits[0],hits[0]]
    for y in hits[1:]:
        if y==cur[1]+1: cur[1]=y
        else: runs.append(cur);cur=[y,y]
    runs.append(cur)
    for a,b in runs: print(f"   y={a}..{b} (ep={b-a+1}px)  couleur={bande(px,(a+b)//2,600,720)}")
    return runs

print("--- cible #2c3640 (filet .sv-bas) ---")
cherche(D+"reference-1080x2102.png","#2c3640",12,1400,2102,"REF (controle positif)")
cherche(D+"capture-1080x2400.png","#2c3640",12,1200,2400,"CAP")
print("\n--- tolerance elargie a 20 sur la CAPTURE ---")
cherche(D+"capture-1080x2400.png","#2c3640",20,1200,2400,"CAP tol20")
print("\n--- CONTROLE NEGATIF cible #00ff00 ---")
cherche(D+"reference-1080x2102.png","#00ff00",12,434,2102,"REF neg")
cherche(D+"capture-1080x2400.png","#00ff00",12,143,2400,"CAP neg")

print("\n--- ou commence exactement le fond .sv-bas (#141a21) dans la CAPTURE ? ---")
im=Image.open(D+"capture-1080x2400.png").convert("RGB"); px=im.load()
for y in range(1780,1920,4):
    print(f"   y={y}  {bande(px,y,600,720)}")
