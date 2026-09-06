#!/usr/bin/env python3
"""INSTRUMENT 6-bis — balayage des QUATRE coins, pas seulement celui ou j'ai vu quelque chose.

La planche precedente ne regardait que le coin bas-droite : un zero obtenu sur une fenetre
choisie apres coup est le zero le moins probant qui soit. On refait donc la planche sur les
quatre coins de chaque image, a 1:1, tuiles 340x200.
"""
import os
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = sorted(f for f in os.listdir(BASE) if f.endswith(".png"))
TW, TH = 340, 200

if __name__ == "__main__":
    for nom, coin in (("bas-droite", "bd"), ("bas-gauche", "bg"), ("haut-gauche", "hg"), ("haut-droite", "hd")):
        pl = Image.new("RGB", (TW * 4, TH * 3), (255, 0, 0))
        for i, f in enumerate(IMAGES):
            im = Image.open(os.path.join(BASE, f)).convert("RGB")
            W, H = im.size
            box = {"bd": (W-TW, H-TH, W, H), "bg": (0, H-TH, TW, H),
                   "hg": (0, 0, TW, TH), "hd": (W-TW, 0, W, TH)}[coin]
            pl.paste(im.crop(box), ((i % 4) * TW, (i // 4) * TH))
        p = os.path.join(BASE, "mesures", f"planche-coins-{nom}.png")
        pl.save(p)
        print(f"  planche {nom} {pl.size} tuiles {TW}x{TH} 1:1, ordre E1..E12 en lignes de 4")
