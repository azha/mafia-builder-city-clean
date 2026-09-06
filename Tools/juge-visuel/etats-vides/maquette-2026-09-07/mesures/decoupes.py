#!/usr/bin/env python3
"""INSTRUMENT 6 — decoupes de lecture (aucune retouche : recadrage strict + agrandissement au
plus proche voisin, donc aucune couleur nouvelle n'est introduite).

Sert a trancher les points de SENS qui ne se voient pas a 1024 : la piece au sol du coffre,
ce qui pend aux pateres, ce qui traine dans la flaque de lumiere, et les coins bas-droite
(plusieurs images portent une marque manuscrite).

Controle : apres decoupe+agrandissement au plus proche voisin, l'ENSEMBLE des couleurs de la
sortie doit etre inclus dans celui de la source (une interpolation en aurait invente).
"""
import os, sys
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "mesures")
IMAGES = sorted(f for f in os.listdir(BASE) if f.endswith(".png"))

DETAILS = [
    ("vide-coffre.png",       (0, 780, 400, 1024), 2, "coffre-sol-gauche"),
    ("vide-coffre.png",       (0, 0, 380, 330),    2, "coffre-mur-haut-gauche"),
    ("vide-famille.png",      (0, 280, 1024, 700), 1, "famille-pateres"),
    ("vide-distribution.png", (180, 380, 900, 1024), 1, "distribution-flaque-et-sol"),
    ("vide-revue.png",        (250, 300, 800, 800), 1, "revue-grain"),
]


def controle_positif(src, dst):
    a = set(c for _, c in src.getcolors(1 << 22))
    b = set(c for _, c in dst.getcolors(1 << 22))
    return b <= a


if __name__ == "__main__":
    ok = True
    for f, box, z, nom in DETAILS:
        im = Image.open(os.path.join(BASE, f)).convert("RGB")
        c = im.crop(box)
        if z > 1:
            c = c.resize((c.width * z, c.height * z), Image.NEAREST)
        p = os.path.join(OUT, f"detail-{nom}.png")
        c.save(p)
        bon = controle_positif(im, c)
        ok &= bon
        print(f"  {f} {im.size} -> {nom} boite={box} zoom x{z} sortie {c.size} "
              f"[couleurs incluses dans la source : {'OUI' if bon else 'NON'}]")

    # planche de contact des coins bas-droite (la ou plusieurs images portent une marque)
    tw, th = 230, 150
    pl = Image.new("RGB", (tw * 4, th * 3), (0, 0, 0))
    src_all = set()
    for i, f in enumerate(IMAGES):
        im = Image.open(os.path.join(BASE, f)).convert("RGB")
        src_all |= set(c for _, c in im.getcolors(1 << 22))
        pl.paste(im.crop((im.width - tw, im.height - th, im.width, im.height)),
                 ((i % 4) * tw, (i // 4) * th))
    p = os.path.join(OUT, "planche-coins-bas-droite.png")
    pl.save(p)
    inclus = set(c for _, c in pl.getcolors(1 << 22)) <= (src_all | {(0, 0, 0)})
    print(f"  planche coins bas-droite {pl.size} (E1..E4 / E5..E8 / E9..E12, tuiles {tw}x{th}) "
          f"[couleurs incluses : {'OUI' if inclus else 'NON'}]")
    if not (ok and inclus):
        sys.exit("controle en echec")
