#!/usr/bin/env python3
"""Detecteur GENERIQUE de filets/bordures : une rangee (ou colonne) est un FILET si
une forte proportion de ses pixels est CHAUDE (R > B+20) et non noire (L>45).
Generique = ne suppose AUCUN hex, donc insensible au jeton employe.
Controle positif  : la reference DOIT rendre >=4 filets (cerne haut/bas, enseigne, CTA).
Controle negatif  : une bande de fond nu doit rendre 0 rangee."""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def chaud(p): return (p[0] - p[2]) > 20 and lum(p) > 45

def scan(f, part=0.35):
    im = Image.open(os.path.join(D, f)).convert('RGB'); W,H=im.size; px=im.load()
    print(f"=== {f}  taille={W}x{H} ===")
    rang = []
    for y in range(H):
        n = sum(1 for x in range(W) if chaud(px[x,y]))
        if n > part*W: rang.append((y,n))
    grp, prev = [], None
    for y,n in rang:
        if prev is None or y != prev+1: grp.append([y,y,n])
        else: grp[-1][1]=y; grp[-1][2]=max(grp[-1][2],n)
        prev=y
    print(f"  FILETS HORIZONTAUX chauds (>{int(part*W)} px/rangee) : {len(grp)} groupe(s)")
    for a,b,n in grp: print(f"    y={a}-{b} ({b-a+1}px) largeur max {n}px")
    cols=[]
    for x in range(W):
        n = sum(1 for y in range(H) if chaud(px[x,y]))
        if n > 0.25*H: cols.append((x,n))
    print(f"  COLONNES chaudes (>{int(0.25*H)} px) : {[(c,n) for c,n in cols]}")
    return len(grp), len(cols)

ng_ref, nc_ref = scan('reference-1080x2102.png')
print(f"  CONTROLE POSITIF reference : {ng_ref} filets attendus >=4 -> {'OK' if ng_ref>=4 else 'ECHEC'}")
print(f"  CONTROLE POSITIF reference : {nc_ref} colonnes attendues >=2 (cerne g/d) -> {'OK' if nc_ref>=2 else 'ECHEC'}")
print()
for f in ['capture-1080x2400.png','capture-ecran-seul-1080x2400.png','capture-ecran-seul-1080x1920.png']:
    scan(f); print()
