#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""08 — `shell.entree` : « Pas de translation » (catalogue l.439). Verification sur pixels.

Methode : correlation croisee normalisee 2D entre shell_t80 et shell_t160, sur la zone de
contenu. Un fondu pur = decalage (0, 0). Le fondu n'est qu'un facteur d'echelle : la
correlation normalisee y est insensible.

Controle positif : t160 contre lui-meme -> (0, 0), correlation 1,0000.
Controle NEGATIF : t160 decale de (+3, -4) px doit etre retrouve a (+3, -4).
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
Y0, Y1, X0, X1 = 250, 1400, 60, 1020        # dans le ContentSlot (bornes 204..2161)


def vec(nom, dx=0, dy=0):
    im = Image.open(os.path.join(D, nom)).convert("RGB")
    print(f"   lu {nom} {im.size}  (decalage artificiel dx={dx} dy={dy})")
    p = im.load()
    v = []
    for y in range(Y0, Y1, 2):
        for x in range(X0, X1, 2):
            r, g, b = p[x + dx, y + dy]
            v.append((r * 299 + g * 587 + b * 114) / 1000.0)
    return v, im


def correl(pa, pb, dx, dy):
    num = da = db = 0.0
    for y in range(Y0, Y1, 2):
        for x in range(X0, X1, 2):
            A = pa[x + dx, y + dy]
            B = pb[x, y]
            a = (A[0] * 299 + A[1] * 587 + A[2] * 114) / 1000.0
            b = (B[0] * 299 + B[1] * 587 + B[2] * 114) / 1000.0
            num += a * b
            da += a * a
            db += b * b
    return num / ((da * db) ** 0.5) if da > 0 and db > 0 else 0.0


def meilleur(nom_a, nom_b, rayon=6, dxa=0, dya=0):
    ia = Image.open(os.path.join(D, nom_a)).convert("RGB")
    ib = Image.open(os.path.join(D, nom_b)).convert("RGB")
    print(f"   {nom_a} {ia.size}  vs  {nom_b} {ib.size}")
    pa, pb = ia.load(), ib.load()
    best = None
    for dy in range(-rayon, rayon + 1):
        for dx in range(-rayon, rayon + 1):
            c = correl(pa, pb, dx + dxa, dy + dya)
            if best is None or c > best[0]:
                best = (c, dx, dy)
    return best


print("== controle positif : t160 contre t160 ==")
c, dx, dy = meilleur("shell-entree_t160ms_1080x2400.png", "shell-entree_t160ms_1080x2400.png")
print(f"   decalage = ({dx:+d}, {dy:+d})  correlation={c:.5f}   attendu (0, 0)")

print("\n== controle NEGATIF : t160 lu avec un decalage IMPOSE de (+3, -4) ==")
c, dx, dy = meilleur("shell-entree_t160ms_1080x2400.png", "shell-entree_t160ms_1080x2400.png",
                     dxa=3, dya=-4)
print(f"   correction trouvee par le detecteur = ({dx:+d}, {dy:+d})  correlation={c:.5f}")
print(f"   attendu (-3, +4) : elle doit ANNULER le decalage impose -> "
      f"{'DETECTE' if (dx, dy) == (-3, 4) else 'NON DETECTE'}")

print("\n== MESURE : shell t80ms vs t160ms (fondu seul ?) ==")
c, dx, dy = meilleur("shell-entree_t80ms_1080x2400.png", "shell-entree_t160ms_1080x2400.png")
print(f"   decalage = ({dx:+d}, {dy:+d}) px  correlation={c:.5f}")
print("   -> 'Pas de translation' :", "CONFORME" if (dx, dy) == (0, 0) else "ECART")

print("\n== MESURE : shell t160ms vs bandeau t0 (meme octet ? deja vu en 00) ==")
c, dx, dy = meilleur("shell-entree_t160ms_1080x2400.png", "bandeau-entree_t0_1080x2400.png",
                     rayon=2)
print(f"   decalage = ({dx:+d}, {dy:+d}) px  correlation={c:.5f}")
