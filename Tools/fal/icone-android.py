#!/usr/bin/env python3
"""Dérive le jeu d'icônes Android depuis une image générée, et PROUVE que le sujet tient dans la
zone sûre adaptive (cercle de 66 dp sur 108 — le launcher coupe tout ce qui déborde, et l'image
« a l'air bonne à plat »).

Le contrôle qui mord n'est pas « il y a de l'encre » : c'est la BOÎTE ENGLOBANTE du sujet, mesurée
sur l'image (pixels qui s'écartent du ciel), confrontée au cercle. Un contrôle positif est exécuté
d'abord : la découpe NON recentrée doit ROUGIR, sinon la garde ne voit rien.

usage : icone-android.py <source.png> <dossier AppIcon>
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops

ZONE_SURE = 288 / 432          # 66 dp / 108 dp
TOLERANCE_PX = 0.002           # part des pixels du sujet tolérée hors cercle (frange d'anti-crénelage)


def masque_sujet(im: Image.Image, fenetre=(200, 0, 830, 880)) -> Image.Image:
    rgb = im.convert("RGB")
    ciel = rgb.crop((40, 40, 120, 120)).resize((1, 1), Image.BOX).getpixel((0, 0))
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, ciel)).convert("L")
    diff = diff.point(lambda v: 255 if v > 45 else 0)
    m = Image.new("L", im.size, 0)
    m.paste(diff.crop(fenetre), fenetre[:2])   # ni la pluie en marge, ni le sol
    return m


def part_hors_cercle(masque: Image.Image) -> float:
    w, h = masque.size
    cx, cy, r = w / 2, h / 2, ZONE_SURE * w / 2
    px = masque.load()
    total = dehors = 0
    for y in range(h):
        for x in range(w):
            if px[x, y]:
                total += 1
                if (x - cx) ** 2 + (y - cy) ** 2 > r * r:
                    dehors += 1
    return dehors / total if total else 1.0


def composer(src: Image.Image):
    """Recentre le sujet et DÉZOOME jusqu'à ce que sa boîte englobante tienne dans le cercle sûr.

    Le dézoom prolonge l'image par réplication des bords (fond plat, ciel/sol en dégradé vertical) —
    jamais par une couleur choisie : la toile garde le dégradé de la source, ligne à ligne.
    """
    bb = masque_sujet(src).getbbox()
    x0, y0, x1, y1 = bb
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    diag = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5
    cote = int(diag / ZONE_SURE * 1.06) + 1          # 6 % de marge sur le cercle
    cote = max(cote, src.size[0])
    marge = cote                                     # assez pour recentrer n'importe où
    w, h = src.size
    toile = Image.new("RGBA", (w + 2 * marge, h + 2 * marge))
    # réplication des bords : colonnes gauche/droite, puis lignes haut/bas (coins compris)
    toile.paste(src, (marge, marge))
    toile.paste(src.crop((0, 0, 1, h)).resize((marge, h)), (0, marge))
    toile.paste(src.crop((w - 1, 0, w, h)).resize((marge, h)), (marge + w, marge))
    bande = toile.crop((0, marge, w + 2 * marge, marge + 1))
    toile.paste(bande.resize((w + 2 * marge, marge)), (0, 0))
    bande = toile.crop((0, marge + h - 1, w + 2 * marge, marge + h))
    toile.paste(bande.resize((w + 2 * marge, marge)), (0, marge + h))
    gx, gy = int(marge + cx - cote / 2), int(marge + cy - cote / 2)
    boite = (gx, gy, gx + cote, gy + cote)
    # le masque du sujet voyage AVEC la composition : c'est le même sujet, mesuré une fois sur la source
    masque = Image.new("L", toile.size, 0)
    masque.paste(masque_sujet(src), (marge, marge))
    return toile.crop(boite), masque.crop(boite), bb, cote


def main() -> None:
    src = Image.open(sys.argv[1]).convert("RGBA")
    out = Path(sys.argv[2])
    brut = part_hors_cercle(masque_sujet(src).resize((432, 432), Image.NEAREST))
    rec, masque, bb, cote = composer(src)
    net = part_hors_cercle(masque.resize((432, 432), Image.NEAREST))
    print(f"bbox sujet {bb} · toile {cote} px · hors zone sûre : brut {brut:.4f} → composé {net:.4f}")
    if brut <= TOLERANCE_PX:
        sys.exit("contrôle positif RATÉ : la découpe brute passe déjà — la garde ne voit rien")
    if net > TOLERANCE_PX:
        sys.exit(f"sujet hors zone sûre après composition ({net:.4f} > {TOLERANCE_PX})")
    for nom, taille in (("icone_adaptive_fond_432", 432), ("icone_legacy_192", 192), ("icone_round_192", 192)):
        rec.resize((taille, taille), Image.LANCZOS).save(out / f"{nom}.png")
    Image.new("RGBA", (432, 432), (0, 0, 0, 0)).save(out / "icone_adaptive_avant_432.png")
    print("écrit :", ", ".join(p.name for p in sorted(out.glob("icone_*.png"))))


if __name__ == "__main__":
    main()
