#!/usr/bin/env python3
"""21 — INTERLIGNES (line-height) mesures de bas de jambage a bas de jambage.

Deux lignes consecutives qui portent TOUTES DEUX une descendante donnent un ecart
bas-a-bas egal a l'interligne, sans depender de la casse des premiers caracteres.
  - carte de file : « ... vos operations » / « sont sous pression. »   (REF, p + p)
                    « ... je ne » / « rallume pas. »                   (JEU, j/p + p)
  - rangee de la suite : « ... rapporte rien » / « tant qu'il dort. »  (p + q, MEME CHAINE)

CONTROLE POSITIF : la MEME chaine (« Blanchissez-le... / tant qu'il dort. ») des deux cotes.
CONTROLE NEGATIF : deux bandes NON consecutives doivent rendre un ecart bien plus grand.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre

def bas(im, x0, x1, y0, y1, fondL, marge=12):
    px = im.load(); s = fondL + marge
    ys = [y for y in range(y0, y1) for x in range(x0, x1) if luminance_simple(px[x, y]) > s]
    return (min(ys), max(ys)) if ys else None

CAS = [
  ("carte de file, raison (.rep 8,4px/1,35 = 11,34 CSS attendu)",
   ("ref4", 86, 700, (1660,1706), (1708,1752), 700, 1655),
   ("c24",  78, 700, (1890,1930), (1930,1966), 700, 1885)),
  ("rangee de la suite, raison (.t4 span 8,4px/1,35) MEME CHAINE",
   ("ref4", 95, 700, (1330,1379), (1379,1422), 760, 1222),
   ("c24",  92, 700, (1300,1348), (1348,1390), 760, 1198)),
  ("rangee de la suite, titre serif (.t4 b 11px/1,25 = 13,75 CSS) MEME CHAINE",
   ("ref4", 95, 700, (1228,1274), (1274,1325), 760, 1222),
   ("c24",  92, 700, (1200,1248), (1248,1298), 760, 1198)),
]
print("=== 21 — interlignes ===")
for lib, (ca,xa0,xa1,wa1,wa2,xfa,yfa), (cb,xb0,xb1,wb1,wb2,xfb,yfb) in CAS:
    ia = ouvrir(ca, bavard=False); ib = ouvrir(cb, bavard=False)
    print(f"   [lu] {ca} {ia.size[0]}x{ia.size[1]} / {cb} {ib.size[0]}x{ib.size[1]}")
    fa = luminance_simple(mediane_fenetre(ia, xfa, yfa, 3))
    fb = luminance_simple(mediane_fenetre(ib, xfb, yfb, 3))
    a1 = bas(ia, xa0, xa1, *wa1, fa); a2 = bas(ia, xa0, xa1, *wa2, fa)
    b1 = bas(ib, xb0, xb1, *wb1, fb); b2 = bas(ib, xb0, xb1, *wb2, fb)
    da = a2[1]-a1[1]; db = b2[1]-b1[1]
    print(f"   {lib}")
    print(f"        REF bandes {a1} et {a2} -> interligne = {da}px = {css(da):5.2f} CSS")
    print(f"        JEU bandes {b1} et {b2} -> interligne = {db}px = {css(db):5.2f} CSS")
    print(f"        delta = {db-da:+d}px ({100*(db-da)/da:+.1f} %)  {'EGAL(<=10%)' if abs(100*(db-da)/da)<=10 else 'ECART'}")
    print()
