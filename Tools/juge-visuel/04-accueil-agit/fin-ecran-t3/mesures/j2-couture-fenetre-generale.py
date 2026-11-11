#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""POINT 1 — couture des deux options (boutons / consequences) de ④ avant geste.

Refait la mesure de instrument-29 avec une fenetre Y GENEREUSE et auto-bornee :
l'instrument 29 coupait la 1re ligne de consequence en 2400 (ligne marquee
!! TRONQUEE dans sa propre sortie). Ici la fenetre part du BAS des boutons
(detecte) et descend jusqu'au BAS de la carte (detecte), avec 40 px de marge
en plus de chaque cote ; chaque bande de texte est imprimee une par une avec
son extension a GAUCHE et a DROITE de la gouttiere, et toute bande qui touche
un bord de fenetre est signalee.

Controles :
  POSITIF  — mesure identique (a <= 2 px) en 1080x2400 et 1080x1920 (meme mise en page) ;
             et, sur la reference, meme resultat que instrument-29 (fenetre deja saine).
  NEGATIF  — un seuil qui ne separe rien (trou=400) doit rendre 1 seul bloc, pas 2 ;
             et la meme routine sur la rangee des BOUTONS doit rendre deux blocs a une
             AUTRE abscisse que celle des consequences.
Chaque ouverture imprime la taille de l'image.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6
# X0/X1 : interieur de l'ecran, hors liseres de bord (x=0..2 et x=1077..1079 de la reference
# sont a lum 66 — un bord d'ecran, pas de l'encre de carte). Verifie par sondage : l'encre
# utile des deux etages est comprise dans [98..981] des deux cotes.
X0, X1 = 40, 1045


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def ouvrir(path):
    im = Image.open(path).convert("RGB")
    print("    ouvert %-46s %s" % (os.path.basename(path)[:46], im.size))
    return im, im.load()


def bandes(px, y0, y1, s):
    """bandes horizontales d'encre (>= 3 px de haut) dans [y0,y1["""
    out = []
    prev, cur = 0, None
    for y in range(y0, y1):
        xs = [x for x in range(X0, X1) if lum(px[x, y]) > s]
        if xs and cur is None:
            cur = [y, y, min(xs), max(xs)]
        elif xs:
            cur[1] = y
            cur[2] = min(cur[2], min(xs))
            cur[3] = max(cur[3], max(xs))
        elif cur is not None:
            if cur[1] - cur[0] >= 3:
                out.append(cur)
            cur = None
    if cur is not None and cur[1] - cur[0] >= 3:
        out.append(cur)
    return out


def colonnes(px, y0, y1, s, trou, larg_min=40):
    cols = set(x for x in range(X0, X1) if any(lum(px[x, y]) > s for y in range(y0, y1)))
    bs, cur, v = [], None, 0
    for x in range(X0, X1):
        if x in cols:
            cur = [x, x] if cur is None else [cur[0], x]
            v = 0
        else:
            if cur is not None:
                v += 1
                if v >= trou:
                    bs.append(cur)
                    cur = None
    if cur:
        bs.append(cur)
    return [b for b in bs if b[1] - b[0] + 1 >= larg_min]


def css(n):
    return n / ECH


def etage(im, px, nom, y0, y1, s=95, trou=30, titre=""):
    print("  %s  fenetre y=[%d..%d[  seuil=%d trou=%d" % (titre or nom, y0, y1, s, trou))
    bs = bandes(px, y0, y1, s)
    cols = colonnes(px, y0, y1, s, trou)
    gout = None
    if len(cols) == 2:
        gout = (cols[0][1] + 1, cols[1][0] - 1)
    for b in bs:
        touche = "  !! TOUCHE LE BORD DE FENETRE" if (b[0] <= y0 or b[1] >= y1 - 1) else ""
        if gout:
            xg = [x for x in range(X0, gout[0]) if any(lum(px[x, y]) > s for y in range(b[0], b[1] + 1))]
            xd = [x for x in range(gout[1] + 1, X1) if any(lum(px[x, y]) > s for y in range(b[0], b[1] + 1))]
            g = "G x=[%4d..%4d]" % (min(xg), max(xg)) if xg else "G  -           "
            d = "D x=[%4d..%4d]" % (min(xd), max(xd)) if xd else "D  -           "
            print("      bande y=[%4d..%4d]  %s  %s%s" % (b[0], b[1], g, d, touche))
        else:
            print("      bande y=[%4d..%4d]  x=[%4d..%4d]%s" % (b[0], b[1], b[2], b[3], touche))
    for b in cols:
        print("      COLONNE x=[%4d..%4d]  l=%4d px = %6.2f CSS   centre=%7.1f px = %6.2f CSS"
              % (b[0], b[1], b[1] - b[0] + 1, css(b[1] - b[0] + 1), (b[0] + b[1]) / 2.0, css((b[0] + b[1]) / 2.0)))
    if gout:
        print("      GOUTTIERE x=[%d..%d]  l=%d px = %.2f CSS   centre=%.1f px" %
              (gout[0], gout[1], gout[1] - gout[0] + 1, css(gout[1] - gout[0] + 1), (gout[0] + gout[1]) / 2.0))
    elif len(cols) != 2:
        print("      !! %d colonne(s) isolee(s) — pas de gouttiere" % len(cols))
    return cols, gout


# Fenetres Y etablies par un balayage prealable de bandes (mesures/j0 ci-dessous, sortie collee
# dans le rapport) : elles encadrent LARGEMENT la 1re et la derniere bande de chaque etage.
#   reference  : boutons 1141..1275, consequences 1300..1449
#   H01 2400   : boutons 1541..1668, consequences 1698..1855
#   H01 1920   : boutons 1086..1215, consequences 1244..1401
JEUX = [
    ("REFERENCE cadre 5", os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png"), (1130, 1285), (1285, 1475)),
    ("CAPTURE H01 2400", os.path.join(CAP, "H01_AccueilTete_Cadre5_c4c6fc581_b35bdd6cb_1080x2400.png"), (1530, 1682), (1678, 1880)),
    ("CAPTURE H01 1920", os.path.join(CAP, "H01_AccueilTete_Cadre5_c4c6fc581_b35bdd6cb_1080x1920.png"), (1075, 1228), (1224, 1425)),
]

res = {}
for nom, path, yb, yc in JEUX:
    print()
    print(">>>", nom)
    im, px = ouvrir(path)
    cb, gb = etage(im, px, nom, yb[0], yb[1], s=60, trou=20, titre="ETAGE DES BOUTONS")
    cc, gc = etage(im, px, nom, yc[0], yc[1], s=95, trou=30, titre="ETAGE DES CONSEQUENCES")
    res[nom] = (cb, gb, cc, gc)

print()
print(">>> SYNTHESE — chaque consequence est-elle SOUS son bouton ? (px CSS)")
for nom, _, _, _ in JEUX:
    cb, gb, cc, gc = res[nom]
    if len(cb) != 2 or len(cc) != 2:
        print("    %-20s : colonnes non isolees (boutons=%d consequences=%d)" % (nom, len(cb), len(cc)))
        continue
    for i, cote in enumerate(("GAUCHE", "DROITE")):
        bb, co = cb[i], cc[i]
        centre_b = (bb[0] + bb[1]) / 2.0
        centre_c = (co[0] + co[1]) / 2.0
        deborde_g = bb[0] - co[0]
        deborde_d = co[1] - bb[1]
        print("    %-20s %s : bouton x=[%4d..%4d] (l=%6.2f CSS)  consequence x=[%4d..%4d] (l=%6.2f CSS)"
              % (nom, cote, bb[0], bb[1], css(bb[1] - bb[0] + 1), co[0], co[1], css(co[1] - co[0] + 1)))
        print("    %-20s %s : decentrage consequence/bouton = %+.2f CSS ; depassement a gauche %+.2f CSS, a droite %+.2f CSS (positif = la consequence sort du bouton)"
              % ("", cote, css(centre_c - centre_b), css(deborde_g), css(deborde_d)))
    print("    %-20s couture boutons=%7.1f px   couture consequences=%7.1f px   DECALAGE=%+6.2f CSS"
          % (nom, (gb[0] + gb[1]) / 2.0 if gb else -1, (gc[0] + gc[1]) / 2.0 if gc else -1,
             css(((gc[0] + gc[1]) / 2.0) - ((gb[0] + gb[1]) / 2.0)) if (gb and gc) else 0))
    print("    %-20s gouttiere boutons=%6.2f CSS   gouttiere consequences=%6.2f CSS"
          % ("", css(gb[1] - gb[0] + 1) if gb else -1, css(gc[1] - gc[0] + 1) if gc else -1))

print()
print(">>> CONTROLE NEGATIF — trou=400 sur l'etage des consequences : 1 seul bloc attendu")
for nom, path, yb, yc in JEUX:
    im, px = ouvrir(path)
    c = colonnes(px, yc[0], yc[1], 95, 400)
    print("    %-20s : %d bloc(s)  %s" % (nom, len(c), c))
