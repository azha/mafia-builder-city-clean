#!/usr/bin/env python3
"""Planche de comparaison de deux dispositions d'icône adaptive : fond · avant-plan (damier) · composite
avec cercle sûr, puis rendu launcher rond 96/48 sur clair et sombre, avec l'avant-plan décalé de +12 px
(la parallaxe que le launcher applique à cette couche seule).
usage : planche-variantes.py <dossier A> <titre A> <dossier B> <titre B> <sortie.png>"""
import sys
from PIL import Image, ImageChops, ImageDraw


def rond(im, s):
    im = im.resize((s, s), Image.LANCZOS)
    m = Image.new("L", (s, s), 0)
    ImageDraw.Draw(m).ellipse((0, 0, s - 1, s - 1), fill=255)
    return im, m


def colonne(titre, dossier, x, pl, d):
    fond = Image.open(f"{dossier}/icone_adaptive_fond_432.png").convert("RGBA")
    avant = Image.open(f"{dossier}/icone_adaptive_avant_432.png").convert("RGBA")
    d.text((x + 6, 6), titre, fill=(235, 235, 235))
    dam = Image.new("RGBA", (216, 216), (90, 90, 90, 255))
    dd = ImageDraw.Draw(dam)
    for yy in range(0, 216, 12):
        for xx in range(0, 216, 12):
            if (xx // 12 + yy // 12) % 2 == 0:
                dd.rectangle((xx, yy, xx + 11, yy + 11), fill=(140, 140, 140, 255))
    pl.paste(fond.resize((216, 216), Image.LANCZOS), (x, 24))
    pl.paste(Image.alpha_composite(dam, avant.resize((216, 216), Image.LANCZOS)), (x + 224, 24))
    comp = Image.alpha_composite(fond, avant).resize((216, 216), Image.LANCZOS)
    ImageDraw.Draw(comp).ellipse((36, 36, 180, 180), outline=(255, 255, 255, 200), width=1)
    pl.paste(comp, (x + 448, 24))
    d.text((x + 6, 244), "fond", fill=(200, 200, 200))
    d.text((x + 230, 244), "avant-plan (damier = transparent)", fill=(200, 200, 200))
    d.text((x + 454, 244), "composite + cercle sûr", fill=(200, 200, 200))
    vis = Image.alpha_composite(fond, avant).crop((72, 72, 360, 360))
    dec = Image.alpha_composite(fond, ImageChops.offset(avant, 12, 0)).crop((72, 72, 360, 360))
    d.rectangle((x, 264, x + 330, 376), fill=(236, 238, 240))
    d.rectangle((x + 334, 264, x + 664, 376), fill=(12, 13, 16))
    for bx in (x, x + 334):
        for src, ox in ((vis, 8), (dec, 200)):
            im, m = rond(src, 96)
            pl.paste(im, (bx + ox, 272), m)
            im, m = rond(src, 48)
            pl.paste(im, (bx + ox + 104, 296), m)
    d.text((x + 6, 380), "launcher rond 96/48 · à droite : avant-plan décalé de +12 px (parallaxe)", fill=(200, 200, 200))


def main():
    da, ta, db, tb, out = sys.argv[1:6]
    pl = Image.new("RGBA", (1360, 400), (28, 30, 34, 255))
    d = ImageDraw.Draw(pl)
    colonne(ta, da, 8, pl, d)
    colonne(tb, db, 688, pl, d)
    pl.convert("RGB").save(out)
    print(out)


if __name__ == "__main__":
    main()
