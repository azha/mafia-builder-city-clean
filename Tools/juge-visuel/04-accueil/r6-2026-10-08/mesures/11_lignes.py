#!/usr/bin/env python3
"""11 — LARGEUR D'ENCRE d'une ligne de texte (meme chaine des deux cotes).

Quand la chaine est IDENTIQUE dans la reference et dans le jeu, la largeur d'encre de
la ligne mesure la taille de corps SANS depender du choix d'une capitale ni d'un accent :
c'est l'instrument le plus sur dont je dispose. On mesure aussi la hauteur du run HAUT
(capitale/ascendante) dans la meme fenetre.

Les fenetres y viennent des bandes du 07 et de deux decoupes regardees a l'oeil
(ref4 x[90,1040] y[1180,1430] et c24 x[90,1040] y[1150,1400]).

CONTROLE POSITIF : « tant qu'il dort. » et « Blanchissez-le : il ne rapporte rien »
sont les MEMES chaines, dans la MEME rangee, avec le MEME retour a la ligne (verifie
a l'oeil sur les deux decoupes) — temoin homologue.
CONTROLE NEGATIF : la ligne « De l'argent attend dans la » (serif 11 px) doit rendre une
largeur NETTEMENT differente de « tant qu'il dort. » (sans serif 8,4 px).
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def ligne(im, x0, x1, y0, y1, fondL, marge=12):
    """bbox d'encre de la ligne + run de lignes le plus haut (hors soulignement)."""
    px = im.load()
    seuil = fondL + marge
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if luminance_simple(px[x, y]) > seuil:
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return dict(x0=min(xs), x1=max(xs), y0=min(ys), y1=max(ys),
                w=max(xs)-min(xs)+1, h=max(ys)-min(ys)+1, n=len(xs))


def fond(im, x, y, r=3):
    return luminance_simple(mediane_fenetre(im, x, y, r))


# chaine ; (cle, x0,x1,y0,y1) cote REF puis cote JEU ; xfond,yfond
CAS = [
    ("rangee « De l'argent attend dans la »  (.t4 b, serif 11 px)",
     ("ref4", 95, 700, 1230, 1274, 760, 1225), ("c24", 90, 700, 1203, 1245, 760, 1195)),
    ("rangee « planque »                     (.t4 b, serif 11 px)",
     ("ref4", 95, 700, 1278, 1322, 760, 1225), ("c24", 90, 700, 1250, 1295, 760, 1195)),
    ("rangee « Blanchissez-le : il ne rapporte rien » (.t4 span 8,4)",
     ("ref4", 95, 700, 1336, 1378, 760, 1225), ("c24", 90, 700, 1302, 1348, 760, 1195)),
    ("rangee « tant qu'il dort. »            (.t4 span, 8,4 px)",
     ("ref4", 95, 700, 1380, 1422, 760, 1225), ("c24", 90, 700, 1350, 1390, 760, 1195)),
    ("file   « Plusieurs attendent encore »  (.plus, 7,6 px)",
     ("ref4", 95, 700, 1757, 1800, 760, 1750), ("c24", 90, 700, 1965, 2000, 760, 1800)),
    ("file   « Lt. ... attend vos ordres »   (.qui, 9,6 px) [nom different]",
     ("ref4", 95, 700, 1565, 1605, 760, 1555), ("c24", 90, 700, 1822, 1860, 760, 1800)),
    ("suite  « LA SUITE »                    (.sur, 6,6 px)",
     ("ref4", 380, 700, 724, 748, 760, 715), ("c24", 380, 700, 966, 990, 760, 1000)),
    ("tete   « PORTEE »                      (.niveaux span 6,6)",
     ("ref5", 180, 350, 1012, 1040, 760, 995), ("l24", 180, 350, 1452, 1480, 760, 1440)),
    ("tete   titre serif                     (.titre, 16 px) [chaine differente]",
     ("ref5", 150, 950, 844, 896, 760, 830), ("l24", 150, 950, 1358, 1412, 760, 1340)),
]

print("=== 11 — largeur d'encre des lignes de texte ===")
for lib, (ca, xa0, xa1, ya0, ya1, xfa, yfa), (cb, xb0, xb1, yb0, yb1, xfb, yfb) in CAS:
    ia = ouvrir(ca, bavard=False); ib = ouvrir(cb, bavard=False)
    print(f"   [lu] {ca} {ia.size[0]}x{ia.size[1]}   {cb} {ib.size[0]}x{ib.size[1]}")
    ga = ligne(ia, xa0, xa1, ya0, ya1, fond(ia, xfa, yfa))
    gb = ligne(ib, xb0, xb1, yb0, yb1, fond(ib, xfb, yfb))
    if not ga or not gb:
        print(f"   {lib:62s} INCOMPLET"); continue
    dw = gb['w'] - ga['w']; dh = gb['h'] - ga['h']
    print(f"   {lib}")
    print(f"        REF x[{ga['x0']},{ga['x1']}] larg={ga['w']:4d}px ({css(ga['w']):6.2f}CSS) haut={ga['h']:3d}px  encre={ga['n']:5d}px")
    print(f"        JEU x[{gb['x0']},{gb['x1']}] larg={gb['w']:4d}px ({css(gb['w']):6.2f}CSS) haut={gb['h']:3d}px  encre={gb['n']:5d}px")
    print(f"        delta largeur={dw:+5d}px ({100*dw/ga['w']:+6.1f} %)   delta depart x={gb['x0']-ga['x0']:+4d}px"
          f"   {'EGAL(<=2%)' if abs(100*dw/ga['w']) <= 2 else 'ECART'}")
    print()
