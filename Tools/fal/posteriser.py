#!/usr/bin/env python3
"""Réduit un portrait aux ENCRES de la palette — la sérigraphie que le modèle ne rend pas.

Mesuré le 2026-09-06 : demander « three inks only » dans le prompt donne une illustration ordinaire ;
le modèle ne postérise pas. Comme pour le fond, la contrainte ne se demande pas, elle s'IMPOSE après
coup — ici en remappant la luminance sur une rampe de jetons réels du jeu.

Rampe par défaut (jetons mesurés, `canon_palette_extract.json`) :
    #161c2b fond · #2c3242 hudGaugeFaceInner · #b08d3e hudHairlineGold · #eae0c8 hudCreme

Le seuillage est fait sur des SEUILS DE POPULATION (quantiles), pas sur des valeurs absolues : deux
portraits dont l'exposition diffère donnent alors la même répartition d'encres, ce qu'un seuil fixe
ne garantit pas. Le sujet seul est postérisé quand un matte est fourni — postériser le fond aussi
ferait remonter du bruit de compression en aplats.

usage : posteriser.py <image.png> <sortie.png> [matte.png] [#hex,#hex,...]

Deux encres suffisent pour une silhouette sans visage (UNKNOWN) : au-delà, la quantification
fabrique du moucheté sur un aplat uni — mesuré ici même.
"""
import sys
from pathlib import Path

from PIL import Image

RAMPE = ["#161c2b", "#2c3242", "#b08d3e", "#eae0c8"]
# Répartition des encres, en part de pixels du sujet. Les quantiles ÉGAUX (défaut) donnent un quart
# de laiton et un quart de crème : beaucoup d'or à pleine taille, mais c'est CE qui porte l'image à
# 26 px. Mesuré : égal → 30,2 % d'écart au fond à 26 px ; pondéré ombre-dominant (0,52/0,28/0,14/0,06)
# → 12,6 %, soit exactement le niveau de l'illustration non postérisée. Pondérer rend le portrait plus
# canonique de près et lui retire son seul avantage de loin. Le défaut suit la mesure ; `--poids` permet
# de trancher autrement en connaissance de cause.
POIDS_EGAL = None
POIDS_OMBRE = (0.52, 0.28, 0.14, 0.06)
POIDS = POIDS_EGAL


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def main() -> None:
    src = Image.open(sys.argv[1]).convert("RGB")
    sortie = Path(sys.argv[2])
    matte_p = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3].lower().endswith(".png") else None
    rampe = [rgb(c) for c in (sys.argv[4].split(",") if len(sys.argv) > 4 else RAMPE)]

    gris = src.convert("L")
    alpha = None
    if matte_p:
        m = Image.open(matte_p).convert("RGBA")
        if m.size != src.size:
            m = m.resize(src.size, Image.LANCZOS)
        alpha = m.getchannel("A")

    px = list(gris.getdata())
    if alpha is not None:
        a = list(alpha.getdata())
        vals = sorted(v for v, av in zip(px, a) if av > 8)
    else:
        vals = sorted(px)
    if not vals:
        sys.exit("aucun pixel de sujet — rien écrit")
    n = len(rampe)
    poids = POIDS if (POIDS and n == len(POIDS)) else tuple(1 / n for _ in range(n))
    cum, seuils = 0.0, []
    for k in range(n - 1):
        cum += poids[k]
        seuils.append(vals[min(len(vals) - 1, int(len(vals) * cum))])

    out = Image.new("RGB", src.size)
    dst = []
    for i, v in enumerate(px):
        k = 0
        while k < n - 1 and v > seuils[k]:
            k += 1
        dst.append(rampe[k])
    out.putdata(dst)

    if alpha is not None:
        # Seuil à 128, et il est BON. Le 2026-09-06 j'ai cru qu'il laissait passer du fond d'origine
        # (les portraits rendaient « fond L 33,3 » au lieu du jeton à 27,8) et je l'ai durci à 200 +
        # érosion : le chiffre n'a pas bougé d'un dixième. Cause réelle, lue en imprimant les quatre
        # coins : trois valent EXACTEMENT (22,28,43) = le jeton, et le quatrième vaut (44,50,66) = la
        # deuxième encre — l'épaule du sujet ATTEINT ce coin. Le fond était juste ; c'est la sonde qui
        # moyennait un pixel de sujet. Durcissement retiré : il rognait le sujet (remplissage 0,56 →
        # 0,55) pour corriger un défaut qui n'existait pas.
        fond = Image.new("RGB", src.size, rampe[0])
        out = Image.composite(out, fond, alpha.point(lambda v: 255 if v > 128 else 0))
    out.save(sortie)
    parts = " · ".join(f"{c:02x}" for s in seuils for c in (s,))
    print(f"{sortie.name} · {n} encres · seuils de luminance {parts} · sujet {len(vals)} px")


if __name__ == "__main__":
    main()
