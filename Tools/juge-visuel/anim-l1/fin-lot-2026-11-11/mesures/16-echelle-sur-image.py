#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""16 — l'echelle du dossier (1 u = 0,84375 px) tient-elle SUR L'IMAGE ?
Le dossier l'exige : « verifie-la sur les images (largeur de la piste, du curseur) ».

Mesure a mi-hauteur (50 % entre les deux plateaux) la largeur de la PISTE et du CURSEUR sur
bascule-course_t140ms (curseur creme sur piste grise : le meilleur contraste des 4 images).

Controle positif : la piste doit faire 93,9 u = 79,2 px.
Controle negatif : si l'echelle etait 1 u = 1 px, la piste ferait 93,9 px — ecart de 15 px,
que la mesure doit distinguer.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
U = 0.84375


def profil(nom, y0, y1, x0=900, x1=1040):
    im = Image.open(os.path.join(D, nom)).convert("RGB")
    print(f"   lu {nom} {im.size}")
    p = im.load()
    return im, [sum((p[x, y][0] * 299 + p[x, y][1] * 587 + p[x, y][2] * 114) / 1000.0
                    for y in range(y0, y1)) / (y1 - y0) for x in range(x0, x1)], x0


def largeur_a_mi(pr, x0, bas, haut):
    s = (bas + haut) / 2.0
    xs = [i for i, v in enumerate(pr) if v > s]
    # bord sous-pixel par interpolation lineaire
    g, d = xs[0], xs[-1]
    fg = (s - pr[g - 1]) / (pr[g] - pr[g - 1]) if pr[g] != pr[g - 1] else 0
    fd = (pr[d] - s) / (pr[d] - pr[d + 1]) if pr[d] != pr[d + 1] else 0
    return (x0 + g - 1 + fg, x0 + d + fd)


im, pr, x0 = profil("bascule-course_t140ms_1080x2400.png", 962, 976)
# plateaux echantillonnes LA OU ILS SONT PURS (a t140 le curseur est a GAUCHE) :
#   fond    : x 905..925 (hors pilule)  |  piste : x 985..1003 (piste seule)
#   curseur : x 945..958 (coeur du disque)
fond = sum(pr[905 - x0:925 - x0]) / 20.0
piste = sum(pr[985 - x0:1003 - x0]) / 18.0
curseur = sum(pr[945 - x0:958 - x0]) / 13.0
print(f"   niveaux (plateaux purs) : fond={fond:.1f}  piste={piste:.1f}  curseur={curseur:.1f}")

g, d = largeur_a_mi(pr, x0, fond, piste)
print(f"\n== PISTE (mi-hauteur fond/piste) ==")
print(f"   x={g:.2f}..{d:.2f}   largeur = {d-g:.2f} px = {(d-g)/U:.1f} u")
print(f"   | dossier : 93,9 u = {93.9*U:.2f} px   ecart = {(d-g)-93.9*U:+.2f} px")
print(f"   | controle negatif (si 1 u = 1 px) : 93,9 px -> ecart {(d-g)-93.9:+.2f} px REJETE")

prc = [v for v in pr]
g2, d2 = largeur_a_mi(prc, x0, piste, curseur)
print(f"\n== CURSEUR (mi-hauteur piste/curseur) ==")
print(f"   x={g2:.2f}..{d2:.2f}   largeur = {d2-g2:.2f} px = {(d2-g2)/U:.1f} u")
print(f"   | dossier : 42,7 u = {42.7*U:.2f} px   ecart = {(d2-g2)-42.7*U:+.2f} px")

print(f"\n== retrait a gauche (bord piste -> bord curseur), etat ETEINT ==")
print(f"   {g2-g:.2f} px = {(g2-g)/U:.2f} u   | dossier : Px(1) = 4,27 u = {4.27*U:.2f} px")
