#!/usr/bin/env python3
"""Profils de lignes: detecte les frontieres horizontales (bandes) des deux images.
Controle positif: la largeur des deux images DOIT etre 1080 (echelle x3,6 des deux cotes,
dossier.md section Echelle) -> imprime et asserte.
Controle negatif: la hauteur DOIT differer (2102 vs 2400)."""
from PIL import Image
import sys

D = "/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"

def lum(p):
    return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def profil(path, x0, x1, tag):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    print(f"[{tag}] {path.split('/')[-1]} taille={W}x{H}")
    px = im.load()
    rows = []
    for y in range(H):
        s = 0.0
        n = 0
        for x in range(x0, x1, 4):
            s += lum(px[x, y]); n += 1
        rows.append(s/n)
    return im, rows

if __name__ == "__main__":
    ref, rr = profil(D+"reference-1080x2102.png", 60, 1020, "REF")
    cap, rc = profil(D+"capture-1080x2400.png", 60, 1020, "CAP")
    assert ref.size[0] == cap.size[0] == 1080, "controle positif largeur"
    assert ref.size[1] != cap.size[1], "controle negatif hauteur"
    print("CONTROLE POSITIF ok: largeur 1080 des deux cotes (rapport d'echelle 1,00)")
    print("CONTROLE NEGATIF ok: hauteurs 2102 vs 2400 differentes")
    for tag, rows in (("REF", rr), ("CAP", rc)):
        print(f"\n=== {tag} : sauts de luminance moyenne de ligne (|d|>1.2) ===")
        prev = rows[0]
        for y in range(1, len(rows)):
            d = rows[y]-rows[y-1]
            if abs(d) > 1.2:
                print(f"  y={y:5d}  lum {rows[y-1]:7.2f} -> {rows[y]:7.2f}  d={d:+7.2f}")
