#!/usr/bin/env python3
"""Bandes claires (plaque beige / CTA) et leur bbox d'encre, sur la capture
et sur le temoin d'etat v4-1 remis a l'echelle x1.2 (900 -> 1080 = x3,0 -> x3,6).
Controle positif : la plaque beige du temoin et celle de la capture doivent
toutes deux exister (grandeur qu'on SAIT presente des deux cotes) -> si l'une
manque, c'est un ecart, pas une panne d'instrument."""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def charge(path, echelle=1.0):
    im = Image.open(os.path.join(D, path)).convert('RGB')
    print(f"  ouvert: {path}  taille={im.size}  echelle={echelle}")
    if echelle != 1.0:
        im = im.resize((round(im.width*echelle), round(im.height*echelle)), Image.LANCZOS)
        print(f"    -> remis a l'echelle: {im.size}")
    return im

def bandes_claires(im, seuil=120):
    """lignes dont la mediane de luminance depasse `seuil`"""
    w,h = im.size; px = im.load()
    med = []
    for y in range(h):
        vals = sorted(0.2126*px[x,y][0]+0.7152*px[x,y][1]+0.0722*px[x,y][2] for x in range(0,w,4))
        med.append(vals[len(vals)//2])
    bandes=[]; deb=None
    for y in range(h):
        if med[y] >= seuil and deb is None: deb = y
        elif med[y] < seuil and deb is not None:
            if y-deb >= 4: bandes.append((deb, y-1, y-deb))
            deb=None
    if deb is not None: bandes.append((deb,h-1,h-deb))
    return bandes, med

def bbox_x(im, y0, y1, seuil=120):
    w,h=im.size; px=im.load(); xs=[]
    for y in range(y0,y1+1):
        for x in range(w):
            r,g,b=px[x,y]
            if 0.2126*r+0.7152*g+0.0722*b >= seuil: xs.append(x); break
    x0=min(xs) if xs else None
    xs=[]
    for y in range(y0,y1+1):
        for x in range(w-1,-1,-1):
            r,g,b=px[x,y]
            if 0.2126*r+0.7152*g+0.0722*b >= seuil: xs.append(x); break
    x1=max(xs) if xs else None
    return x0,x1

for nom, path, ech in [('CAPTURE (etat vide, 2026-09-04)','capture-1080x2400.png',1.0),
                       ('TEMOIN v4-1 (personne au comptoir) x1.2','etats/v4-1.png',1.2),
                       ('REFERENCE nominale (3 jetons)','reference-1080x2102.png',1.0),
                       ('CAPTURE seuil-force (liste garnie, 2026-09-02)','capture-seuil-force-1080x2400.png',1.0)]:
    print(f"\n=== {nom} ===")
    im = charge(path, ech)
    bandes, med = bandes_claires(im)
    print(f"  bandes claires (mediane>=120, >=4 lignes) : {len(bandes)}")
    for (a,b,n) in bandes:
        x0,x1 = bbox_x(im,a,b)
        print(f"    y={a}..{b} (h={n})  x={x0}..{x1} (l={None if x0 is None else x1-x0+1})")
