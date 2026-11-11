#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""24 — (a) les 14 captures : haut du panneau vert / sombre, bas du panneau, debut du bandeau
d'onglets — pour verifier qu'a 1920 RIEN n'est coupe, rien ne passe sous le chrome, rien ne sort
du cadre ; (b) la pastille « DEJA TRANCHEE » de G03 : bbox et marge au bord interieur de la carte.

Contrôles :
  POSITIF — a 1920 et a 2400, le BAS du panneau doit etre le meme ecart au bas de l'ecran
            (le panneau est ancre en bas) ; on l'imprime.
  NEGATIF — le detecteur de pastille (trait rouge pointille sur papier) ne doit RIEN trouver dans
            G01/G05 (pas de pastille) ni dans la reference cadre 6.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def est_vert(p):
    r, g, b = p
    return (g - r) > 18 and (g - b) > 8 and g > 28


def est_rouge(p):
    r, g, b = p
    return (r - g) > 40 and (r - b) > 40 and 90 < r < 210


def panneau(path):
    im = Image.open(path)
    px = im.convert("RGB").load()
    w, h = im.size
    ys = []
    for y in range(h):
        n = sum(1 for x in range(0, w, 3) if est_vert(px[x, y]))
        if n > 200:
            ys.append(y)
    if not ys:
        return None, im.size
    return (ys[0], ys[-1]), im.size


print(">>> HAUT / BAS DU PANNEAU VERT (ancre bas) — les 12 captures d'apres-geste")
print("%-44s %-12s %-16s %-10s %-10s" % ("fichier", "taille", "panneau y", "haut", "bas->ecran"))
for f in sorted(os.listdir(CAP)):
    if not f.endswith(".png") or f.startswith("H01"):
        continue
    (a, b), t = panneau(os.path.join(CAP, f))
    print("%-44s %-12s y=[%4d..%4d]  haut=%4d   bas a %3d px du bord (%4.1f CSS)" %
          (f[:44], str(t), a, b, a, t[1] - 1 - b, (t[1] - 1 - b) / ECH))

print()
print(">>> idem pour la REFERENCE (cadre 6 / 7)")
for f in ("cadre-6-apres-geste-executed.png", "cadre-7-echec-1re-cible.png"):
    (a, b), t = panneau(os.path.join(REF, f))
    print("%-44s %-12s y=[%4d..%4d]  haut=%4d   bas a %3d px du bord (%4.1f CSS)" %
          (f, str(t), a, b, a, t[1] - 1 - b, (t[1] - 1 - b) / ECH))

print()
print(">>> PASTILLE « DEJA TRANCHEE » — trait rouge pointille dans le BAS de la carte")


def pastille(path, nom, y0, y1):
    im = Image.open(path)
    px = im.convert("RGB").load()
    pts = [(x, y) for y in range(y0, y1) for x in range(90, 720) if est_rouge(px[x, y])]
    if len(pts) < 150:
        print("    %-34s AUCUNE pastille (%d px rouges)   [%s %s]" % (nom, len(pts), os.path.basename(path)[:24], im.size))
        return
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    print("    %-34s bbox x=[%4d..%4d] l=%3d px (%6.2f CSS)  y=[%4d..%4d] h=%2d px (%5.2f CSS)   [%s %s]" %
          (nom, min(xs), max(xs), max(xs) - min(xs) + 1, (max(xs) - min(xs) + 1) / ECH,
           min(ys), max(ys), max(ys) - min(ys) + 1, (max(ys) - min(ys) + 1) / ECH,
           os.path.basename(path)[:24], im.size))
    return (min(xs), min(ys), max(xs), max(ys))


G03 = os.path.join(CAP, "G03_ApresGeste_deja_tranchee_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G03b = os.path.join(CAP, "G03_ApresGeste_deja_tranchee_c3aa3bbdb_b35bdd6cb_1080x1920.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G05 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png")
R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")

print("  controle NEGATIF (pas de pastille attendue) :")
pastille(G01, "G01 bas de carte", 1700, 1800)
pastille(G05, "G05 bas de carte", 1765, 1865)
pastille(R6, "ref cadre 6 bas de carte", 1360, 1450)
print("  mesure :")
b = pastille(G03, "G03 2400", 1880, 1970)
b19 = pastille(G03b, "G03 1920", 1400, 1490)
# carte G03 : x=[99..696] y=[1236..1968]  (mesure 04)
print("    carte G03 2400 (mesure 04) : x=[99..696] y=[1236..1968]")
if b:
    print("    marge pastille / bord de carte : gauche=%d px (%.2f CSS)  droite=%d px (%.2f CSS)  bas=%d px (%.2f CSS)" %
          (b[0] - 99, (b[0] - 99) / ECH, 696 - b[2], (696 - b[2]) / ECH, 1968 - b[3], (1968 - b[3]) / ECH))
