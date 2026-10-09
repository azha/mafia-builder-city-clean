#!/usr/bin/env python3
"""02 — dump de profil brut (exploration). Imprime la taille des images lues."""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, luminance_simple

if len(sys.argv) < 4:
    print("usage: 02_profil.py <cle> h|v <coord> [a] [b] [pas]")
    sys.exit(1)
cle, sens, coord = sys.argv[1], sys.argv[2], int(sys.argv[3])
a = int(sys.argv[4]) if len(sys.argv) > 4 else 0
b = int(sys.argv[5]) if len(sys.argv) > 5 else (10 ** 9)
pas = int(sys.argv[6]) if len(sys.argv) > 6 else 1

im = ouvrir(cle)
px = im.load()
W, H = im.size
if sens == "h":
    b = min(b, W)
    for x in range(a, b, pas):
        p = px[x, coord]
        print(f"x={x:4d} {p}  L={luminance_simple(p):6.1f}")
else:
    b = min(b, H)
    for y in range(a, b, pas):
        p = px[coord, y]
        print(f"y={y:4d} {p}  L={luminance_simple(p):6.1f}")
