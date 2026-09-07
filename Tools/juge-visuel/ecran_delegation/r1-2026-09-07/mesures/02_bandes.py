#!/usr/bin/env python3
"""Frontieres des grandes bandes: haut du panneau, bas de sv-tete, haut de sv-bas, chrome.
Instrument: mediane d'une fenetre 21px de large centree sur x, par ligne (robuste au texte).
Controle positif: la valeur de fond de .sv-bas de la REFERENCE doit valoir #141a21 (CSS) a <=6/255.
Controle negatif: le fond de .serv6 (#1d2229->#121519) doit en DIFFERER."""
from PIL import Image

D = "/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def med(px, x, y, r=10):
    vs=[px[x+i,y] for i in range(-r,r+1)]
    vs.sort(key=lambda p:0.2126*p[0]+0.7152*p[1]+0.0722*p[2])
    return vs[len(vs)//2]
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def scan(path, x, tag):
    im=Image.open(path).convert("RGB"); W,H=im.size
    print(f"[{tag}] {path.split('/')[-1]} {W}x{H} colonne mediane x={x}+-10")
    px=im.load()
    prof=[med(px,x,y) for y in range(H)]
    prev=prof[0]; res=[]
    for y in range(1,H):
        c=prof[y]
        d=max(abs(c[k]-prev[k]) for k in range(3))
        if d>=4:
            res.append((y,prev,c,d))
        prev=c
    return prof,res

for path,x,tag in ((D+"reference-1080x2102.png",30,"REF"),(D+"capture-1080x2400.png",30,"CAP")):
    prof,res=scan(path,x,tag)
    for y,a,b,d in res:
        print(f"   y={y:5d}  {a} -> {b}   dmax={d}")
    print()

# controles
im=Image.open(D+"reference-1080x2102.png").convert("RGB"); px=im.load()
print("CONTROLE POSITIF  fond .sv-bas REF (attendu #141a21 = (20,26,33)) :", med(px,30,1780))
print("CONTROLE NEGATIF  fond .serv6 REF au-dessus (attendu different)   :", med(px,30,1600))
