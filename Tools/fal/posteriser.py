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
import json
import sys
from pathlib import Path

from PIL import Image

# ⚠️ Le premier jeton était `#161c2b`, hérité d'un mandat qui citait un « hudBg » — **ce jeton n'existe
# pas** dans le canon, et 209 portraits ont été posés dessus sans qu'aucune garde puisse le voir : une
# couleur inventée est une couleur valide.
# ⇒ Règle : **le fond d'une pièce est celui du CONTENANT où elle s'affiche.** Les portraits vivent dans
# un médaillon ⇒ `lieutenantMedallionOuter`. Ça NE SE GÉNÉRALISE PAS : une autre famille lit le jeton de
# SON contenant.
# ⛔ Et la rampe est désormais une liste de **NOMS DE JETONS, résolus dans l'asset** — jamais des
# littéraux. Recopier la valeur d'un jeton donne « la bonne valeur par le mauvais chemin » : le juge
# compare des pixels et dit conforme, la garde compte les accès au jeton et dit zéro, **les deux
# instruments sont aveugles au même endroit**, et ça ne se trahit que le jour où le jeton bouge.
RAMPE_JETONS = ["lieutenantMedallionOuter", "hudGaugeFaceInner", "hudHairlineGold", "hudCreme"]
ASSET_PALETTE = Path(__file__).resolve().parents[2] / "Assets/Editor/CanonPaletteExtract/canon_palette_extract.json"


def jeton(nom: str, asset: Path = None) -> str:
    """Résout un nom de jeton dans l'asset du canon. **Un nom absent est FATAL** — c'est la garde qui
    manquait le jour où « hudBg » est entré dans un mandat."""
    chemin = asset or ASSET_PALETTE
    table = {t["name"]: t["hex"] for t in json.loads(chemin.read_text())["tokens"]}
    if nom not in table:
        sys.exit(f"jeton inconnu « {nom} » dans {chemin.name} — une couleur inventée est une couleur valide, "
                 f"donc on refuse de peindre. Jetons proches : {[n for n in table if nom[:4].lower() in n.lower()][:5]}")
    return table[nom]


def rampe_du_canon(asset: Path = None):
    return [jeton(n, asset) for n in RAMPE_JETONS]


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
    rampe = [rgb(c) for c in (args[3].split(",") if len(args) > 3 else rampe_du_canon())]
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
