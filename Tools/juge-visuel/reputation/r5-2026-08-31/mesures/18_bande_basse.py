#!/usr/bin/env python3
"""Temps 3/4 — la bande vide au BAS DU CADRE : hauteur, et luminance de ce qui l'occupe.

Contrôle positif : la luminance moyenne du panneau verdict (bloc plein, identique des deux
  cotes) doit sortir a moins de 3/255 d'ecart.
Contrôle negatif : la bande basse elle-meme, dont on attend un ecart franc.
"""
from PIL import Image
import os

CFG = [('REF', os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'), 3.0, 18, 376),
       ('CAP', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png', 3.6, 18, 18)]
BANDES = {'REF': dict(bas=(443.5, 451.0), verdict=(340, 400)),
          'CAP': dict(bas=(421.5, 450.5), verdict=(322, 380))}


def lum(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


out = {}
for lab, p, ech, cx0, cy0 in CFG:
    im = Image.open(p).convert('RGB')
    px = im.load()
    print(f'--- {lab} {os.path.basename(p)} {im.size}')
    for nom, (y0, y1) in BANDES[lab].items():
        X0, X1 = int(cx0 + 3 * ech), int(cx0 + 285 * ech)
        s = n = 0
        for y in range(int(cy0 + y0 * ech), int(cy0 + y1 * ech)):
            for x in range(X0, X1, 2):
                s += lum(px[x, y])
                n += 1
        print(f'    {nom:9s} y {y0:6.1f}..{y1:6.1f} CSS  (hauteur {y1-y0:5.2f} CSS)  '
              f'luminance moyenne = {s/n:6.2f}/255  sur {n} px')
        out[(lab, nom)] = s / n
print()
print(f'  CONTROLE POSITIF  panneau verdict : REF {out[("REF","verdict")]:.2f} vs '
      f'JEU {out[("CAP","verdict")]:.2f}  ecart {out[("CAP","verdict")]-out[("REF","verdict")]:+.2f}/255')
print(f'  MESURE            bande basse    : REF {out[("REF","bas")]:.2f} vs '
      f'JEU {out[("CAP","bas")]:.2f}  ecart {out[("CAP","bas")]-out[("REF","bas")]:+.2f}/255 '
      f'(x{out[("CAP","bas")]/out[("REF","bas")]:.1f})')
print(f'  hauteur de la bande : REF 9.00 CSS  JEU 31.38 CSS  (x3.5)  [script 16]')
