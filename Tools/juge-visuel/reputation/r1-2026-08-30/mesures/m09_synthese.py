#!/usr/bin/env python3
"""m09 — synthèse des grandeurs invariantes d'échelle (rapports internes).

1. rythme vertical du corps, bloc par bloc, en px CSS (réf /3,0 ; capture /3,6)
2. largeurs des 3 tuiles de compteurs, en % de la largeur d'écran
3. le VIDE en bas du panneau
4. couleurs des titres et graisse de « Il vous écoute »

Toutes les frontières viennent de m02 (runs de colonne) et m04 (runs de ligne) ;
elles sont recopiées ici comme constantes MESURÉES, pas devinées.
Contrôle positif : la somme des blocs + gouttières doit retomber sur la hauteur du
panneau mesurée indépendamment.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-120.png"
C19 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
C24 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png"

# (nom, y0, y1) mesurés par m02, bordures incluses
REF_BLOCS = [("padding haut", 379, 399), ("enseigne", 400, 557), ("gouttière", 558, 584),
             ("compteurs", 585, 680), ("gouttière", 681, 707), ("miroir", 708, 1342),
             ("gouttière", 1343, 1369), ("note", 1370, 1598), ("gouttière", 1599, 1625),
             ("CTA", 1626, 1704), ("VIDE bas", 1705, 1728)]
CAP_BLOCS = [("padding haut", 21, 45), ("enseigne", 46, 229), ("gouttière", 230, 261),
             ("compteurs", 262, 413), ("gouttière", 414, 445), ("miroir", 446, 1122),
             ("gouttière", 1123, 1157), ("note", 1158, 1421), ("gouttière", 1422, 1456),
             ("CTA", 1457, 1541), ("VIDE bas", 1542, 1898)]


def rythme(nom, blocs, ech, panneau):
    print(f"\n  {nom} — panneau intérieur = {panneau[1]-panneau[0]+1} px = "
          f"{(panneau[1]-panneau[0]+1)/ech:.1f} CSS")
    s = 0
    for n, a, b in blocs:
        h = b - a + 1; s += h
        print(f"    {n:14s} {h:5d} px  {h/ech:7.1f} CSS   {100.0*h/(panneau[1]-panneau[0]+1):6.2f} % du panneau")
    print(f"    (contrôle positif) somme = {s} px vs panneau {panneau[1]-panneau[0]+1} px")
    return {n: (b - a + 1) / ech for n, a, b in blocs if n != "gouttière"}


if __name__ == "__main__":
    for p in (REF, C19, C24):
        print(p.split('/')[-1], Image.open(p).size)

    r = rythme("RÉFÉRENCE m-120 (x3,0)", REF_BLOCS, 3.0, (379, 1728))
    c = rythme("CAPTURE 1080x1920 (x3,6)", CAP_BLOCS, 3.6, (21, 1898))
    print("\n  écarts bloc à bloc (CSS) :")
    for k in r:
        print(f"    {k:14s} réf {r[k]:7.1f}  jeu {c[k]:7.1f}  delta {c[k]-r[k]:+7.1f} CSS "
              f"({100.0*(c[k]-r[k])/r[k]:+6.1f} %)")

    # 1080x2400 : mêmes blocs, le vide devient 1542..2378
    print("\n  1080x2400 : VIDE bas = 2378-1542+1 =", 2378 - 1542 + 1, "px =",
          f"{(2378-1542+1)/3.6:.1f} CSS =",
          f"{100.0*(2378-1542+1)/(2378-21+1):.1f} % du panneau")

    print("\n  --- largeurs des 3 tuiles de compteurs (m04) ---")
    for nom, W, tuiles in [("RÉF", 900, [(42, 298), (320, 576), (598, 854)]),
                           ("JEU", 1080, [(46, 409), (432, 718), (740, 1033)])]:
        ls = [(b - a + 1) for a, b in tuiles]
        print(f"    {nom} : " + "  ".join(f"{l} px = {100.0*l/W:.2f} %L" for l in ls)
              + f"   -> écart max/min = {max(ls)/min(ls):.3f}")

    print("\n  --- couleurs des titres ---")
    for nom, p, pts in [("RÉF", REF, {"Le miroir (fût du L)": (285, 445),
                                      "Pas encore jugeable": (470, 750),
                                      "Il vous écoute": (200, 1207),
                                      "titre de la note": (100, 1450)}),
                        ("JEU", C19, {"Le miroir (fût du L)": (360, 105),
                                      "Pas encore jugeable": (548, 490),
                                      "Il vous écoute": (185, 1020),
                                      "titre de la note": (95, 1248)})]:
        im = Image.open(p).convert("RGB")
        for k, xy in pts.items():
            print(f"    {nom} {k:24s} {xy} = {im.getpixel(xy)}")
