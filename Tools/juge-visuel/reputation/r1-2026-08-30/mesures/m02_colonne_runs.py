#!/usr/bin/env python3
"""m02 — découpe verticale par RUNS de couleur le long d'une colonne.

Le profil global (m01) ne discrimine pas : chaque bloc a son propre aplat, donc tout
est « encre ». On lit donc une COLONNE et on liste les plages de couleur constante :
chaque changement d'aplat est une frontière de bloc.

Échelle : réf x3,0 ; captures x3,6.
Contrôle positif : la taille de l'image est imprimée.
Contrôle négatif : on imprime le nombre de runs ; 1 seul run voudrait dire que
l'instrument ne voit rien.
"""
from PIL import Image
import sys

def runs(path, x, tol=8, minlen=4, echelle=1.0):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    print(f"\n=== {path}  taille={im.size}  colonne x={x}  échelle x{echelle}")
    px = im.load()
    out = []
    cur = px[x, 0]; d = 0
    for y in range(1, h):
        c = px[x, y]
        if any(abs(c[i] - cur[i]) > tol for i in range(3)):
            out.append((d, y - 1, cur))
            cur = c; d = y
    out.append((d, h - 1, cur))
    print(f"    runs bruts = {len(out)}  (contrôle négatif : >1)")
    for a, b, c in out:
        if b - a + 1 < minlen:
            continue
        print(f"      y {a:5d}..{b:5d}  h={b-a+1:5d} px  {(b-a+1)/echelle:7.1f} CSS   rgb={c}")

if __name__ == "__main__":
    REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-120.png"
    C19 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
    C24 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png"
    # x choisi dans une gouttière verticale : entre les blocs, pas sur du texte.
    runs(REF, 60, echelle=3.0)
    runs(C19, 72, echelle=3.6)
    runs(C24, 72, echelle=3.6)
