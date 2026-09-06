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

⚠️ **Les frontières entre encres sont FRANCHES, et l'œil lit ça comme de la pixelisation** (retour user
2026-09-07 : « c'est pixelisé, c'est normal ? »). Ce n'est pas la résolution — l'image fait 1024² — c'est
qu'un aplat à 4 encres n'a AUCUN ton intermédiaire : chaque dégradé devient un escalier. Le remède ne
consiste ni à ajouter des encres (on perdrait la DA) ni à flouter (on perdrait les aplats) : on
**suréchantillonne**. Postériser à 2× puis réduire ne crée des pixels intermédiaires QUE sur les
frontières — les aplats restent des aplats, les bords deviennent nets. C'est le défaut par ici ;
`--franc` rend l'ancien comportement.

usage : posteriser.py <image.png> <sortie.png> [matte.png] [#hex,#hex,...] [--franc]

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
    args = [a for a in sys.argv[1:] if a not in ("--franc", "--ombre-dominante")]
    adoucir = "--franc" not in sys.argv
    # ⚠️ Les quantiles ÉGAUX donnent la crème au quart le plus clair — sur un PORTRAIT c'est le visage,
    # sur une SCÈNE éclairée c'est la flaque de lumière au mur, et l'objet se noie (mesuré le 2026-09-07
    # sur les douze états vides). `--ombre-dominante` rend l'ombre majoritaire : la lumière redevient un
    # accent. Le bon réglage dépend de ce qu'on postérise, pas d'un goût.
    global POIDS
    if "--ombre-dominante" in sys.argv:
        POIDS = POIDS_OMBRE
    src = Image.open(args[0]).convert("RGB")
    sortie = Path(args[1])
    matte_p = args[2] if len(args) > 2 and args[2].lower().endswith(".png") else None
    rampe = [rgb(c) for c in (args[3].split(",") if len(args) > 3 else RAMPE)]
    taille = src.size
    if adoucir:
        # 2× AVANT le seuillage : les frontières tombent alors sur une grille deux fois plus fine, et
        # la réduction finale les moyenne. Les aplats, eux, restent identiques à eux-mêmes.
        src = src.resize((taille[0] * 2, taille[1] * 2), Image.LANCZOS)

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
    if adoucir:
        out = out.resize(taille, Image.LANCZOS)
    out.save(sortie)
    parts = " · ".join(f"{c:02x}" for s in seuils for c in (s,))
    print(f"{sortie.name} · {n} encres · seuils de luminance {parts} · sujet {len(vals)} px")


if __name__ == "__main__":
    main()
