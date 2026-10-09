#!/usr/bin/env python3
"""13 — etiquette de gravite (.qui small) et alignement gauche des lignes de la
carte de file. Fenetres ELARGIES (x0=52) : au 12c les fenetres commencaient a 88/90,
c.-a-d. SUR le premier glyphe — le mot pouvait etre rogne par l'instrument.

CONTROLE POSITIF : les 4 lignes de la carte de file sont alignees a gauche sur le meme
x dans la REFERENCE (padding 10 px du .suivant) ; l'instrument doit le retrouver.
CONTROLE NEGATIF : une fenetre y VIDE (entre deux lignes) doit rendre « aucune encre ».
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def encre(im, x0, x1, y0, y1, fondL, marge=12):
    px = im.load(); s = fondL + marge
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if luminance_simple(px[x, y]) > s:
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return dict(x0=min(xs), x1=max(xs), y0=min(ys), y1=max(ys),
                w=max(xs)-min(xs)+1, h=max(ys)-min(ys)+1, n=len(xs))


CAS = [
    ("ref4", "REF4", 46, 1531, [("titre .qui       ", 1565, 1605),
                                ("gravite small    ", 1610, 1650),
                                ("raison .rep L1   ", 1660, 1706),
                                ("raison .rep L2   ", 1708, 1748),
                                ("plus .plus       ", 1757, 1800)], 760, 1555),
    ("c24",  "C24 ", 47, 1716, [("titre .qui       ", 1822, 1860),
                                ("gravite small    ", 1860, 1890),
                                ("raison .rep L1   ", 1892, 1930),
                                ("raison .rep L2   ", 1930, 1964),
                                ("plus .plus       ", 1965, 2000)], 760, 1800),
    ("l24",  "L24 ", 47, 1716, [("titre .qui       ", 1805, 1842),
                                ("gravite small    ", 1843, 1872),
                                ("raison .rep L1   ", 1875, 1912),
                                ("raison .rep L2   ", 1912, 1947),
                                ("raison .rep L3   ", 1947, 1978),
                                ("plus .plus       ", 1982, 2012)], 760, 1790),
]

print("=== 13 — carte de file : alignement gauche et etiquette de gravite ===")
for cle, nom, xcarte, ycarte, lignes, xf, yf in CAS:
    im = ouvrir(cle)
    f = luminance_simple(mediane_fenetre(im, xf, yf, 3))
    print(f"   {nom} carte x0={xcarte}  (fondL={f:.1f})")
    for lib, y0, y1 in lignes:
        e = encre(im, 52, 1000, y0, y1, f)
        if not e:
            print(f"        {lib} AUCUNE ENCRE"); continue
        print(f"        {lib} x[{e['x0']:4d},{e['x1']:4d}] larg={e['w']:4d}px  y[{e['y0']},{e['y1']}] haut={e['h']:3d}px"
              f"  retrait gauche = {e['x0']-xcarte:3d}px ({css(e['x0']-xcarte):5.2f}CSS)"
              f"  couleur_mediane={mediane_fenetre(im, (e['x0']+e['x1'])//2, (e['y0']+e['y1'])//2, 1)}")
    print()

print("=== CONTROLE NEGATIF : fenetre y VIDE entre deux lignes ===")
im = ouvrir("c24", bavard=False)
f = luminance_simple(mediane_fenetre(im, 760, 1800, 3))
e = encre(im, 52, 1000, 1856, 1862, f)
print(f"   c24 y[1856,1862] (interligne) : {'aucune encre (OK)' if not e else 'encre=' + str(e['n'])}")
