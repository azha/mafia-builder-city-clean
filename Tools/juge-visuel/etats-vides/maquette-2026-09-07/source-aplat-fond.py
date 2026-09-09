#!/usr/bin/env python3
"""Détache un portrait de son fond généré et le repose sur un APLAT au jeton exact de la palette.

Décision du 2026-09-06 : le modèle IGNORE l'hexadécimal donné en prompt — fond demandé `#161c2b`
(luminance 27), fonds obtenus L 39 à 231 selon le lot. Le fond ne se demande donc pas, il s'IMPOSE
après coup : les portraits deviennent uniformes par construction au lieu de dépendre d'un prompt,
et le contraste se mesure APRÈS l'aplat, jamais avant.

Garde : le détourage doit remplir au moins la moitié de sa propre boîte englobante. Un matte à trous
— un sujet sombre confondu avec un fond sombre — donne une image « présente, aux bonnes couleurs, et
le mauvais dessin » ; le script refuse d'écrire dans ce cas plutôt que de produire un portrait
troué que personne ne regardera à 1024.

usage : aplat-fond.py <image.png> <matte.png> <sortie.png> [#161c2b]
"""
import sys
from pathlib import Path

from PIL import Image

PLANCHER_REMPLISSAGE = 0.5


def taux_remplissage(alpha: Image.Image) -> float:
    op = alpha.point(lambda v: 255 if v > 0 else 0)
    bb = op.getbbox()
    if not bb:
        return 0.0
    return op.histogram()[255] / ((bb[2] - bb[0]) * (bb[3] - bb[1]))


def main() -> None:
    src = Image.open(sys.argv[1]).convert("RGBA")
    matte = Image.open(sys.argv[2]).convert("RGBA")
    sortie = Path(sys.argv[3])
    jeton = (sys.argv[4] if len(sys.argv) > 4 else "#161c2b").lstrip("#")

    if matte.size != src.size:
        matte = matte.resize(src.size, Image.LANCZOS)
    alpha = matte.getchannel("A")

    rempli = taux_remplissage(alpha)
    if rempli < PLANCHER_REMPLISSAGE:
        sys.exit(f"matte à trous : remplissage de boîte {rempli:.2f} < {PLANCHER_REMPLISSAGE} — rien écrit")

    bb = alpha.point(lambda v: 255 if v > 0 else 0).getbbox()
    couvre = ((bb[2] - bb[0]) * (bb[3] - bb[1])) / (src.size[0] * src.size[1])

    fond = Image.new("RGBA", src.size, tuple(int(jeton[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
    sujet = src.copy()
    sujet.putalpha(alpha)
    Image.alpha_composite(fond, sujet).convert("RGB").save(sortie)
    print(f"{sortie.name} · remplissage {rempli:.2f} · le sujet couvre {couvre * 100:.0f} % du cadre · fond #{jeton}")


if __name__ == "__main__":
    main()
