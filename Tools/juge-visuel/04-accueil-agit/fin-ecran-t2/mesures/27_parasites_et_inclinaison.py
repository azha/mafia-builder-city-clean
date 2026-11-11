#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""27 — (a) CHASSE AUX PARASITES : le coin HAUT-DROIT de la carte (la ou la maquette ne met RIEN
en mode apres-geste ; c'est la que se trouvait le cachet de cire) doit etre du papier nu dans les
6 etats. On compte les pixels d'encre (L < 165) dans ce quadrant.
(b) INCLINAISON de la carte : la carte est posee « de travers » ; on mesure l'angle par le bord
GAUCHE (pour chaque ligne, la 1re colonne de papier), regression sur la partie droite du bord.

Contrôles :
  POSITIF — le coin haut-GAUCHE (losange + TACTIQUE) doit lui compter beaucoup d'encre : c'est ce
            qui prouve que le compteur sait voir quelque chose.
  NEGATIF — le centre d'une zone de papier vierge doit compter 0.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6

CARTES = {
    "cadre-6-apres-geste-executed.png": (112, 692, 689, 1448),
    "cadre-7-echec-1re-cible.png": (107, 809, 691, 1565),
    "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png": (104, 1062, 693, 1795),
    "G02_ApresGeste_noted_c3aa3bbdb_b35bdd6cb_1080x2400.png": (100, 1159, 696, 1891),
    "G03_ApresGeste_deja_tranchee_c3aa3bbdb_b35bdd6cb_1080x2400.png": (99, 1236, 696, 1968),
    "G04_ApresGeste_404_plus_la_c3aa3bbdb_b35bdd6cb_1080x2400.png": (100, 1159, 696, 1891),
    "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png": (100, 1127, 696, 1860),
    "G06_ApresGeste_noted_structurelle_c3aa3bbdb_b35bdd6cb_1080x2400.png": (104, 1159, 693, 1891),
}


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def quadrant(path, coin):
    f = os.path.basename(path)
    im = Image.open(path)
    px = im.convert("RGB").load()
    x0, y0, x1, y1 = CARTES[f]
    w = x1 - x0 + 1
    h = y1 - y0 + 1
    if coin == "HD":
        ax, bx = x0 + int(0.55 * w), x1 - 22
        ay, by = y0 + 22, y0 + int(0.22 * h)
    elif coin == "HG":
        ax, bx = x0 + 22, x0 + int(0.45 * w)
        ay, by = y0 + 22, y0 + int(0.22 * h)
    else:  # papier vierge
        ax, bx = x0 + int(0.25 * w), x0 + int(0.75 * w)
        ay, by = y0 + int(0.24 * h), y0 + int(0.30 * h)
    n = sum(1 for y in range(ay, by) for x in range(ax, bx) if lum(px[x, y]) < 165)
    tot = (by - ay) * (bx - ax)
    return n, tot, (ax, ay, bx, by)


print(">>> COIN HAUT-DROIT de la carte : encre attendue = 0 (rien n'y est dessine)")
for f in sorted(CARTES):
    p = os.path.join(REF if f.startswith("cadre") else CAP, f)
    n, tot, z = quadrant(p, "HD")
    print("    %-58s HD : %5d / %6d px d'encre (%.3f %%)  zone=%s" % (f[:58], n, tot, 100.0 * n / tot, str(z)))

print()
print(">>> CONTROLE POSITIF — coin haut-GAUCHE (losange + TACTIQUE) : doit etre non nul")
for f in ("cadre-7-echec-1re-cible.png", "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png"):
    p = os.path.join(REF if f.startswith("cadre") else CAP, f)
    n, tot, z = quadrant(p, "HG")
    print("    %-58s HG : %5d / %6d px d'encre (%.3f %%)" % (f[:58], n, tot, 100.0 * n / tot))

print()
print(">>> CONTROLE NEGATIF — bande de papier vierge sous le coin")
for f in ("cadre-7-echec-1re-cible.png", "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png"):
    p = os.path.join(REF if f.startswith("cadre") else CAP, f)
    n, tot, z = quadrant(p, "V")
    print("    %-58s vierge : %5d / %6d px d'encre (%.3f %%)" % (f[:58], n, tot, 100.0 * n / tot))

print()
print(">>> INCLINAISON de la carte (bord gauche)")


def est_papier(p):
    r, g, b = p
    return r > 195 and g > 180 and b > 130 and (r - b) > 20


def inclinaison(path):
    f = os.path.basename(path)
    im = Image.open(path)
    px = im.convert("RGB").load()
    x0, y0, x1, y1 = CARTES[f]
    h = y1 - y0 + 1
    bord = {}
    for y in range(y0 + int(0.15 * h), y0 + int(0.85 * h)):
        for x in range(max(0, x0 - 25), x0 + 80):
            if est_papier(px[x, y]):
                bord[y] = x
                break
    ys = sorted(bord)
    if len(ys) < 50:
        print("    %-58s bord introuvable" % f[:58])
        return
    a, b = ys[len(ys) // 6], ys[5 * len(ys) // 6]
    pente = (bord[b] - bord[a]) / float(b - a)
    import math
    print("    %-58s bord gauche : x=%d a y=%d  ->  x=%d a y=%d   pente=%+.4f  angle=%+.2f deg" %
          (f[:58], bord[a], a, bord[b], b, pente, math.degrees(math.atan(pente))))


for f in sorted(CARTES):
    inclinaison(os.path.join(REF if f.startswith("cadre") else CAP, f))
