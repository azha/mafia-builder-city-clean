#!/usr/bin/env python3
"""10 — decoupe une fenetre pour inspection a l'oeil (et imprime la taille lue)."""
import sys, os
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir

cle, x0, y0, x1, y1, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
im = ouvrir(cle)
c = im.crop((x0, y0, x1, y1))
f = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
if f != 1.0:
    c = c.resize((int(c.size[0]*f), int(c.size[1]*f)), 0)
c.save(out)
print(f"[decoupe] {cle} x[{x0},{x1}] y[{y0},{y1}] -> {out} {c.size[0]}x{c.size[1]} (facteur {f})")
