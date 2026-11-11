#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""05 — position du CURSEUR a chaque instant, lue sur les PIXELS (pas sur le journal).

Methode : dans la bande de la piste (y 955..982, le coeur de la pilule), profil de luminance
par colonne. Le curseur est un disque de Px(10) = 42,7 u = 36,0 px : on glisse une fenetre de
36 px et on retient le centre qui maximise (moyenne dedans - moyenne dehors). Insensible a
l'alpha global : le contraste curseur/piste survit au fondu.

Controle positif n.1 : largeur de la piste mesuree = 93,9 u x 0,84375 = 79,2 px (dossier).
Controle positif n.2 : a `avant` et a `t0` le journal donne la MEME position physique
   (-4,27 u ancre a droite = 46,93 u ancre a gauche) ; les deux centres mesures doivent
   coincider a < 2 px.
Controle negatif   : le meme detecteur applique a une bande VIDE (y 1100..1120, pas de piste)
   ne doit PAS rendre un score separant curseur et fond (score effondre).
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
U_PX = 0.84375                      # 1 u = 0,84375 px (dossier.md)
LARG_CURSEUR_U = 42.7
LARG_CURSEUR_PX = LARG_CURSEUR_U * U_PX
BANDE = (955, 982)


def lum(p):
    return (p[0] * 299 + p[1] * 587 + p[2] * 114) / 1000.0


def profil(im, x0, x1, y0, y1):
    px = im.load()
    return [sum(lum(px[x, y]) for y in range(y0, y1 + 1)) / (y1 - y0 + 1)
            for x in range(x0, x1 + 1)]


def bords_piste(nom):
    """bords gauche/droit de la pilule sur `avant` (or sur quasi-noir)."""
    im = Image.open(os.path.join(D, nom)).convert("RGB")
    print(f"   {nom} {im.size}")
    pr = profil(im, 880, 1060, *BANDE)
    fond = min(pr)
    pic = max(pr)
    seuil = fond + 0.5 * (pic - fond)
    xs = [i for i, v in enumerate(pr) if v > seuil]
    return 880 + xs[0], 880 + xs[-1]


def centre_curseur(nom, xg, xd, bande=BANDE):
    im = Image.open(os.path.join(D, nom)).convert("RGB")
    pr = profil(im, xg, xd, *bande)
    n = len(pr)
    w = int(round(LARG_CURSEUR_PX))
    best, bestsc = None, None
    for c in range(w // 2, n - w // 2):
        dedans = pr[c - w // 2:c + w // 2 + 1]
        dehors = pr[:c - w // 2] + pr[c + w // 2 + 1:]
        if not dehors:
            continue
        sc = sum(dedans) / len(dedans) - sum(dehors) / len(dehors)
        if bestsc is None or sc > bestsc:
            bestsc, best = sc, c
    return im.size, xg + best, bestsc


print("== bords de la piste (image `avant`) ==")
XG, XD = bords_piste("bascule-course_avant_1080x2400.png")
larg_px = XD - XG + 1
print(f"   piste : x={XG}..{XD}  largeur={larg_px} px = {larg_px/U_PX:.1f} u"
      f"   | dossier : 93,9 u = {93.9*U_PX:.1f} px")

print()
print("== centre du curseur, par instant ==")
res = {}
for nom, jx in [("bascule-course_avant_1080x2400.png", 46.93),   # -4,27 ancre a droite
                ("bascule-course_t0_1080x2400.png", 46.93),
                ("bascule-course_t70ms_1080x2400.png", 17.70),
                ("bascule-course_t140ms_1080x2400.png", 4.27)]:
    taille, c, sc = centre_curseur(nom, XG, XD)
    # journal : x = bord GAUCHE du curseur, en u depuis le bord gauche de la piste
    attendu_px = XG + (jx + LARG_CURSEUR_U / 2) * U_PX
    res[nom] = c
    print(f"   {nom[:38]:38s} {taille}  centre={c} px  score={sc:6.1f}  "
          f"attendu(journal {jx:5.2f} u)={attendu_px:.1f} px  ecart={c-attendu_px:+.1f} px "
          f"({(c-attendu_px)/U_PX:+.1f} u)")

print()
print("== controle positif n.2 : `avant` et `t0` = meme position physique ? ==")
d = abs(res["bascule-course_avant_1080x2400.png"] - res["bascule-course_t0_1080x2400.png"])
print(f"   ecart = {d} px  -> {'OK (<2 px)' if d < 2 else 'ECART'}")

print()
print("== controle negatif : bande la plus PLATE de la colonne (aucun curseur) ==")
im0 = Image.open(os.path.join(D, "bascule-course_avant_1080x2400.png")).convert("RGB")
meilleure, amplitude = None, None
for y0 in range(700, 1500, 10):
    pr = profil(im0, XG, XD, y0, y0 + 20)
    amp = max(pr) - min(pr)
    if amplitude is None or amp < amplitude:
        amplitude, meilleure = amp, y0
print(f"   bande la plus plate : y={meilleure}..{meilleure+20}, amplitude={amplitude:.1f}")
for nom in ["bascule-course_avant_1080x2400.png", "bascule-course_t70ms_1080x2400.png"]:
    taille, c, sc = centre_curseur(nom, XG, XD, (meilleure, meilleure + 20))
    print(f"   {nom[:38]:38s} score={sc:6.2f}  (doit etre tres inferieur aux scores ci-dessus)")

print()
print("== course mesuree sur les pixels ==")
a = res["bascule-course_t0_1080x2400.png"]
b = res["bascule-course_t140ms_1080x2400.png"]
m = res["bascule-course_t70ms_1080x2400.png"]
print(f"   t0 -> t140 : {a} -> {b} = {a-b:.1f} px = {(a-b)/U_PX:.1f} u"
      f"   | attendu Dx = 42,67 u = {42.67*U_PX:.1f} px")
print(f"   fraction parcourue a t70 : {(a-m)/(a-b):.3f}   | ease-out a mi-duree = 0,685")
print("   centre attendu a t70 selon la courbe (depart 987 px, course 35 px) :")
for nom_c, f in [("ease-out  (0,685)", 0.685), ("lineaire  (0,500)", 0.500),
                 ("ease-in   (0,315)", 0.315)]:
    att = a - f * (a - b)
    print(f"      {nom_c} -> {att:6.1f} px   ecart au mesure ({m} px) = {m-att:+5.1f} px"
          f"   {'RETENU' if abs(m-att) <= 2 else 'REJETE'}")
