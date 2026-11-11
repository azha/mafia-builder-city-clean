#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""00 — inventaire des 11 captures : taille d'image, sha256, part de pixels NON noirs.
Controle positif : les 11 images doivent faire 1080x2400 (valeur annoncee par dossier.md).
Controle negatif : le sha256 de deux fichiers de tailles d'octets differentes DOIT differer.
"""
import hashlib, os
from PIL import Image

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")
D = os.path.normpath(D)

noms = sorted(f for f in os.listdir(D) if f.endswith(".png"))
print("repertoire :", D)
print(f"{'fichier':44s} {'taille image':>13s} {'octets':>9s} {'non-noir %':>10s}  sha256[:16]")
shas = {}
for n in noms:
    p = os.path.join(D, n)
    im = Image.open(p)
    taille = im.size
    rgb = im.convert("RGB")
    px = rgb.getdata()
    tot = taille[0] * taille[1]
    # pixel "non noir" = un canal > 8/255 (bruit de compression/noir pur)
    nn = 0
    for r, g, b in px:
        if r > 8 or g > 8 or b > 8:
            nn += 1
    h = hashlib.sha256(open(p, "rb").read()).hexdigest()
    shas[n] = h
    print(f"{n:44s} {str(taille):>13s} {os.path.getsize(p):>9d} {100.0*nn/tot:>9.2f}%  {h[:16]}")

print()
print("— doublons octet pour octet (sha256 identiques) —")
inv = {}
for n, h in shas.items():
    inv.setdefault(h, []).append(n)
trouve = False
for h, lst in inv.items():
    if len(lst) > 1:
        trouve = True
        print("  IDENTIQUES :", " == ".join(sorted(lst)), f"({h[:16]})")
if not trouve:
    print("  aucun")

print()
print("— controle positif : toutes les images en 1080x2400 ? —")
ok = all(Image.open(os.path.join(D, n)).size == (1080, 2400) for n in noms)
print("  ", "OUI" if ok else "NON")
print("— controle negatif : sha de 2 fichiers de tailles d'octets differentes —")
a, b = "shell-entree_t0_1080x2400.png", "shell-entree_avant_1080x2400.png"
print(f"   {a} != {b} ? ", shas[a] != shas[b])
