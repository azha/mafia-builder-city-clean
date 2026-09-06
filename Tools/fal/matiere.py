#!/usr/bin/env python3
"""Prépare une texture générée pour l'écran : teinte dans la palette, mesure sa couture, juge sa
lisibilité SOUS le texte du chrome.

Trois choses qu'une texture doit prouver, et qu'on ne voit pas en la regardant seule :

1. **Elle vit dans la palette.** Comme le fond des portraits et leurs encres, la couleur ne se demande
   pas au modèle — elle s'impose. Ici en BICHROMIE : la luminance est remappée entre deux jetons
   (ombre → lumière), ce qui garde le grain de la matière et supprime ses couleurs propres. Postériser
   la détruirait ; désaturer ne suffirait pas (le liège resterait brun-rouge).

2. **Elle se tuile sans couture.** Le contrôle est une MESURE, pas un coup d'œil : on compare la
   colonne de gauche à celle de droite (et la ligne du haut à celle du bas) comme si l'image était
   répétée, et on rapporte l'écart moyen en niveaux de gris. Un écart bien plus grand que celui de
   deux colonnes VOISINES prises au milieu de l'image signe une couture visible — c'est le contrôle
   positif, sans lequel « 6,2 » ne veut rien dire.

3. **Le texte reste lisible dessus.** Le seuil est celui du canon (`T.asset.contrast_wcag_floor`,
   4,5:1 pour du texte). On mesure le contraste de l'encre crème du jeu contre le pire endroit de la
   matière — le plus CLAIR pour une encre claire —, pas contre sa moyenne : une texture moyenne à
   3,0:1 peut porter une zone à 1,8:1 où la phrase disparaît.

usage : matiere.py <texture.png> <sortie.png> [--ombre #161c2b] [--lumiere #b08d3e] [--encre #eae0c8]
"""
import argparse
from pathlib import Path

from PIL import Image, ImageStat

ENCRE = "#eae0c8"        # hudCreme — l'encre des écrans
PLANCHER_TEXTE = 4.5     # T.asset.contrast_wcag_floor
# Plancher ABSOLU du raccord : sous ~2 niveaux sur 255, l'écart est du bruit de quantification et
# aucun œil ne le voit. Sans lui, le critère « au plus le double du témoin » condamne les textures
# TRÈS lisses — le papier pelure rend témoin 0,5 et raccord 1,2, donc « couture visible » pour un
# écart de un niveau. Un critère en RATIO seul n'a pas de sens quand le dénominateur tend vers zéro.
COUTURE_NEGLIGEABLE = 2.0


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def luminance_rel(c):
    def canal(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * canal(c[0]) + 0.7152 * canal(c[1]) + 0.0722 * canal(c[2])


def contraste(a, b):
    la, lb = luminance_rel(a), luminance_rel(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def bichromie(im, ombre, lumiere):
    gris = im.convert("L")
    lo, hi = gris.getextrema()
    etendue = max(1, hi - lo)
    table = []
    for canal in range(3):
        table += [int(ombre[canal] + (lumiere[canal] - ombre[canal]) * max(0, min(255, (v - lo) * 255 // etendue)) / 255)
                  for v in range(256)]
    return Image.merge("RGB", [gris.point(table[canal * 256:(canal + 1) * 256]) for canal in range(3)])


def rendre_tuilable(im, bande=0.18):
    """Rend une texture raccordable PAR CONSTRUCTION — le modèle ne le fait pas.

    Mesuré le 2026-09-06 : « seamless tileable » écrit dans le prompt donne des écarts de raccord de
    14 à 25 niveaux contre un témoin de 1 à 4 — trois textures sur trois. Comme le fond et les encres
    des portraits, la propriété ne se demande pas, elle s'impose : on décale l'image d'une demi-période
    (les anciens bords se rejoignent alors au CENTRE, où l'on peut travailler) et on fond cette jointure
    avec la version miroir, dont le raccord tombe ailleurs. Les nouveaux bords sont l'ancien centre :
    continus par construction."""
    from PIL import ImageChops
    w, h = im.size
    decale = ImageChops.offset(im, w // 2, h // 2)
    miroir = decale.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM)
    masque = Image.new("L", (w, h), 0)
    px = masque.load()
    bx, by = max(1, int(w * bande)), max(1, int(h * bande))
    for y in range(h):
        fy = max(0.0, 1.0 - abs(y - h / 2) / by)
        for x in range(w):
            fx = max(0.0, 1.0 - abs(x - w / 2) / bx)
            px[x, y] = int(255 * max(fx, fy))
    return Image.composite(miroir, decale, masque)


def ecart(bande_a, bande_b):
    diff = [abs(a - b) for a, b in zip(bande_a.convert("L").getdata(), bande_b.convert("L").getdata())]
    return sum(diff) / len(diff)


def couture(im):
    """Écart au raccord, et son contrôle positif : deux colonnes voisines du milieu."""
    w, h = im.size
    vert = ecart(im.crop((0, 0, 2, h)), im.crop((w - 2, 0, w, h)))
    horiz = ecart(im.crop((0, 0, w, 2)), im.crop((0, h - 2, w, h)))
    temoin = ecart(im.crop((w // 2, 0, w // 2 + 2, h)), im.crop((w // 2 + 2, 0, w // 2 + 4, h)))
    return vert, horiz, temoin


def pire_contraste(im, encre):
    """Le pire endroit pour une encre CLAIRE : le carreau le plus clair de la texture."""
    w, h = im.size
    pire, ou = 99.0, None
    pas = max(16, w // 24)
    for y in range(0, h - pas, pas):
        for x in range(0, w - pas, pas):
            moy = ImageStat.Stat(im.crop((x, y, x + pas, y + pas))).mean[:3]
            c = contraste(tuple(int(v) for v in moy), encre)
            if c < pire:
                pire, ou = c, (x, y)
    return pire, ou


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("source")
    p.add_argument("sortie")
    p.add_argument("--ombre", default="#161c2b")
    p.add_argument("--lumiere", default="#b08d3e")
    p.add_argument("--encre", default=ENCRE)
    p.add_argument("--tuiler", action="store_true", help="impose le raccord au lieu de l'espérer du modèle")
    a = p.parse_args()

    src = Image.open(a.source).convert("RGB")
    avant = couture(src) if a.tuiler else None
    if a.tuiler:
        src = rendre_tuilable(src)
    out = bichromie(src, rgb(a.ombre), rgb(a.lumiere))
    Path(a.sortie).parent.mkdir(parents=True, exist_ok=True)
    out.save(a.sortie)

    vert, horiz, temoin = couture(out)
    pire, ou = pire_contraste(out, rgb(a.encre))
    moy = ImageStat.Stat(out).mean[:3]
    moyen = contraste(tuple(int(v) for v in moy), rgb(a.encre))
    verdict = "OK" if pire >= PLANCHER_TEXTE else f"SOUS LE PLANCHER ({PLANCHER_TEXTE})"
    print(f"{Path(a.sortie).name} · bichromie {a.ombre}→{a.lumiere}" + (" · raccord imposé" if a.tuiler else ""))
    if avant:
        print(f"  avant tuilage : verticale {avant[0]:.1f} · horizontale {avant[1]:.1f} · témoin {avant[2]:.1f}")
    print(f"  couture   verticale {vert:.1f} · horizontale {horiz:.1f} · témoin (2 colonnes voisines) {temoin:.1f}"
          f" ⇒ {'raccord invisible' if max(vert, horiz) <= max(temoin * 2, COUTURE_NEGLIGEABLE) else 'COUTURE VISIBLE'}")
    print(f"  encre {a.encre}  contraste moyen {moyen:.2f}:1 · PIRE carreau {pire:.2f}:1 en {ou} ⇒ {verdict}")


if __name__ == "__main__":
    main()
