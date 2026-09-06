#!/usr/bin/env python3
"""Planche contact d'un lot de portraits, jugée AUX TAILLES RÉELLES d'écran.

Le seul oracle qui compte ici : les portraits sont vus PETITS. Tailles mesurées dans le client —
26 px (rangée de ㉙ Conflit et ㉘ Distribution, `AddLayoutElement(portrait, preferredWidth: Px(26f))`),
40 px (rangée d'organigramme), 71 px (médaillon de fiche, `RefMedaillonDiametre = 71`). Une image qui
ne se distingue pas de sa voisine à 26 px n'a pas d'identité, quelle que soit sa beauté à 1024.

Imprime aussi, par image : le contraste sujet↔fond et la part d'encre claire — un portrait qui perd
sa silhouette sur le bleu-gris du fond disparaît dans la liste.

usage : planche-portraits.py <sortie.png> <étiquette>=<image.png> ...
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

TAILLES = (71, 40, 26)
VIGNETTE = 220


def luminance(px):
    return 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2]


def mesures(im):
    """Contraste du sujet contre son fond, et part de pixels qui S'EN ECARTENT, a 26 px.

    Corrige le 2026-09-06 : la v1 ne regardait que les pixels PLUS CLAIRS que le fond. Sur un lot
    serigraphie encre-sombre-sur-papier-clair elle a rendu « contraste 1,00 / 1,07 / 1,07 et 0,0 % » —
    trois valeurs quasi identiques et toutes fausses, la signature d'un instrument qui mesure autre
    chose. Les grandeurs sont desormais SANS DIRECTION : l'ecart au fond compte des deux cotes, et le
    contraste prend l'extreme le plus eloigne du fond."""
    p = im.convert("RGB")
    w, h = p.size
    coins = [p.getpixel((4, 4)), p.getpixel((w - 5, 4)), p.getpixel((4, h - 5)), p.getpixel((w - 5, h - 5))]
    fond = sum(luminance(c) for c in coins) / 4
    petit = p.resize((26, 26), Image.LANCZOS)
    vals = [luminance(petit.getpixel((x, y))) for y in range(26) for x in range(26)]
    ecart = sum(1 for v in vals if abs(v - fond) > 40) / len(vals)
    extreme = max(vals) if (max(vals) - fond) >= (fond - min(vals)) else min(vals)
    hi, lo = max(fond, extreme), min(fond, extreme)
    return fond, (hi + 5) / (lo + 5), ecart


def main():
    sortie, *paires = sys.argv[1:]
    items = [(e.split("=", 1)[0], Image.open(e.split("=", 1)[1]).convert("RGB")) for e in paires]
    larg = 16 + len(items) * (VIGNETTE + 16)
    haut = 30 + VIGNETTE + 16 + max(TAILLES) + 22 + 18
    pl = Image.new("RGB", (larg, haut), (13, 15, 16))
    d = ImageDraw.Draw(pl)
    for i, (nom, im) in enumerate(items):
        x = 16 + i * (VIGNETTE + 16)
        d.text((x, 8), nom, fill=(234, 224, 200))
        pl.paste(im.resize((VIGNETTE, VIGNETTE), Image.LANCZOS), (x, 26))
        y = 26 + VIGNETTE + 14
        ox = x
        for t in TAILLES:
            pl.paste(im.resize((t, t), Image.LANCZOS), (ox, y + (max(TAILLES) - t)))
            ox += t + 10
        fond, contraste, clairs = mesures(im)
        d.text((x, y + max(TAILLES) + 6), f"71·40·26 px  fond {fond:.0f}  contraste {contraste:.2f}:1  ecart {clairs*100:.0f}%",
               fill=(138, 151, 156))
    pl.save(sortie)
    print(sortie)
    for nom, im in items:
        fond, contraste, clairs = mesures(im)
        print(f"  {nom:<12} fond L={fond:>5.1f} · contraste max/fond {contraste:.2f}:1 · ecart au fond à 26 px {clairs*100:.1f} %")


if __name__ == "__main__":
    main()
