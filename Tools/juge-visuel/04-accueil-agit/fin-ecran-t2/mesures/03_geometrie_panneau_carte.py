#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""03 — geometrie : bbox du PANNEAU VERT, bbox de la CARTE PAPIER, bbox du JETON (disque dore).
Chaque bbox est donnee en px d'image, en px CSS (/3,6 — echelle du dossier, 1080 px = 300 CSS des DEUX
cotes) et en % de la largeur d'ecran (1080) pour X, en % de la HAUTEUR DU PANNEAU pour Y.

Detecteurs (calibres par 02_sondes_couleurs.py) :
  vert   : g-r > 18 et g-b > 8 et g > 28
  papier : r > 195 et g > 180 et b > 130 et r-b > 20
  jeton  : dore (r > 170, g > 140, b < 140, r-b > 60) DANS la bande a droite de la carte

Contrôle POSITIF : la largeur de l'ecran vaut 1080 px partout (impose) et le panneau vert touche
les deux bords x=0 et x=1079 dans la reference comme dans la capture (le panneau est pleine largeur).
Contrôle NEGATIF : le detecteur « papier » applique a la reference cadre 5 (ou AUCUNE carte papier
n'existe) doit rendre moins de 0,2 % de pixels — sinon il voit n'importe quoi.
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


def est_papier(p):
    r, g, b = p
    return r > 195 and g > 180 and b > 130 and (r - b) > 20


def est_dore(p):
    r, g, b = p
    return r > 170 and g > 140 and b < 150 and (r - b) > 60


def bbox(im, pred, x0=0, y0=0, x1=None, y1=None, minrun=8):
    """bbox des pixels qui satisfont pred, en exigeant >= minrun pixels sur la ligne/colonne
    (anti-bruit : un glyphe isole ne doit pas elargir la bbox)."""
    px = im.convert("RGB").load()
    w, h = im.size
    x1 = w if x1 is None else x1
    y1 = h if y1 is None else y1
    lignes = {}
    cols = {}
    for y in range(y0, y1):
        c = 0
        for x in range(x0, x1):
            if pred(px[x, y]):
                c += 1
                cols[x] = cols.get(x, 0) + 1
        if c >= minrun:
            lignes[y] = c
    if not lignes:
        return None
    ys = sorted(lignes)
    xs = sorted([x for x, c in cols.items() if c >= minrun])
    if not xs:
        return None
    return (xs[0], ys[0], xs[-1], ys[-1])


def pct_pred(im, pred):
    px = im.convert("RGB").load()
    w, h = im.size
    n = 0
    t = 0
    for y in range(0, h, 3):
        for x in range(0, w, 3):
            t += 1
            if pred(px[x, y]):
                n += 1
    return 100.0 * n / t


def rapport(path, zone_jeton_x=(640, 1080)):
    im = Image.open(path)
    w, h = im.size
    print("=== %s  %dx%d" % (os.path.basename(path), w, h))
    bv = bbox(im, est_vert, minrun=200)
    if bv:
        print("    panneau vert   bbox px = %s   largeur=%d px (%.1f CSS)  hauteur=%d px" %
              (str(bv), bv[2] - bv[0] + 1, (bv[2] - bv[0] + 1) / ECH, bv[3] - bv[1] + 1))
        ph = bv[3] - bv[1] + 1
        py0 = bv[1]
    else:
        print("    panneau vert   ABSENT")
        ph = h
        py0 = 0
    bp = bbox(im, est_papier, y0=(py0 if bv else 0), minrun=30)
    if bp:
        cw = bp[2] - bp[0] + 1
        ch = bp[3] - bp[1] + 1
        print("    carte papier   bbox px = %s" % str(bp))
        print("                   largeur=%d px = %.1f CSS = %.2f %% de l'ecran" % (cw, cw / ECH, 100.0 * cw / w))
        print("                   hauteur=%d px = %.1f CSS ; RATIO l/h = %.4f" % (ch, ch / ECH, cw / float(ch)))
        print("                   marge gauche=%d px (%.1f CSS) ; marge droite ecran=%d px" % (bp[0], bp[0] / ECH, w - 1 - bp[2]))
        print("                   haut carte a %.1f %% de la hauteur du panneau" % (100.0 * (bp[1] - py0) / ph))
        print("                   bas  carte a %.1f %% de la hauteur du panneau" % (100.0 * (bp[3] - py0) / ph))
    else:
        print("    carte papier   ABSENTE")
    bj = bbox(im, est_dore, x0=zone_jeton_x[0], x1=zone_jeton_x[1], y0=(py0 if bv else 0), minrun=25)
    if bj:
        jw = bj[2] - bj[0] + 1
        jh = bj[3] - bj[1] + 1
        print("    jeton dore     bbox px = %s  diam x=%d (%.1f CSS) diam y=%d  rondeur=%.3f" %
              (str(bj), jw, jw / ECH, jh, jw / float(jh)))
        if bp:
            print("                   diam / largeur carte = %.3f ; centre x = %d px (%.1f %% ecran)" %
                  (jw / float(bp[2] - bp[0] + 1), (bj[0] + bj[2]) // 2, 100.0 * ((bj[0] + bj[2]) / 2.0) / w))
    else:
        print("    jeton dore     ABSENT dans la bande %s" % str(zone_jeton_x))
    print()


print(">>> REFERENCES")
rapport(os.path.join(REF, "cadre-6-apres-geste-executed.png"))
rapport(os.path.join(REF, "cadre-7-echec-1re-cible.png"))

print(">>> CAPTURES 1080x2400")
for f in ["G01_ApresGeste_executed", "G02_ApresGeste_noted", "G03_ApresGeste_deja_tranchee",
          "G04_ApresGeste_404_plus_la", "G05_ApresGeste_premiere_cible_en_echec",
          "G06_ApresGeste_noted_structurelle"]:
    rapport(os.path.join(CAP, f + "_c3aa3bbdb_b35bdd6cb_1080x2400.png"))

print(">>> CONTROLE NEGATIF — detecteur papier sur cadre 5 (aucune carte papier)")
im5 = Image.open(os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png"))
print("    cadre 5 %s : %.3f %% de pixels 'papier' (doit etre < 0,2)" % (im5.size, pct_pred(im5, est_papier)))
im6 = Image.open(os.path.join(REF, "cadre-6-apres-geste-executed.png"))
print("    cadre 6 %s : %.3f %% de pixels 'papier' (contrôle positif : forte)" % (im6.size, pct_pred(im6, est_papier)))
