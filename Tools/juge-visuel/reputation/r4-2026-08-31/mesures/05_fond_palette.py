#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 1/2/3 — (a) le fond HORS panneau racine : profil de couleur le long
des marges gauche/droite/basse ; (b) palette quantifiée de la zone commune.

CONTRÔLE POSITIF : le fond hors panneau en HAUT (y proche du haut du panneau
racine) doit être quasi identique dans les deux images — c'est le même token de
fond ; s'il ne l'est pas, l'écart mesuré en bas ne vaut rien.
CONTRÔLE NÉGATIF : on demande au même profil la couleur d'un point PRIS DANS
le panneau (x=200), dont on sait qu'il n'est pas le fond : la valeur doit
diverger nettement des marges.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def median(im, cx, cy, r=3):
    px = im.load()
    v = [px[x, y] for x in range(cx - r, cx + r + 1) for y in range(cy - r, cy + r + 1)]
    v.sort(key=lum)
    return v[len(v) // 2]


def main():
    ref = Image.open(REF).convert("RGB")
    cap = Image.open(CAP).convert("RGB")
    print(f"REF {REF} {ref.size}   CAP {CAP} {cap.size}")

    # marge gauche : x=8 ; on parcourt la hauteur du panneau racine en fraction f
    print("\n(a) MARGE GAUCHE x=8, en fraction de la hauteur du panneau racine")
    print(f"{'f':>5} {'réf (y)':>18} {'jeu (y)':>18} {'Δ max':>6}")
    for i in range(11):
        f = i / 10
        yr = int(377 + f * (1730 - 377))
        yc = int(19 + f * (1900 - 19))
        yr = min(max(yr, 5), 1746)
        yc = min(max(yc, 5), 1914)
        a, b = median(ref, 8, yr), median(cap, 8, yc)
        print(f"{f:>5.1f} {str(a)+' y'+str(yr):>18} {str(b)+' y'+str(yc):>18} "
              f"{max(abs(a[i]-b[i]) for i in range(3)):>6}")

    print("\n(b) BANDE BASSE, sous le panneau racine (réf y=1745, jeu y=1912)")
    for x in (40, 200, 360, 540, 720, 900, 1040):
        xr = int(19 + (x - 19) / 1.2)
        if xr > 894:
            continue
        a, b = median(ref, xr, 1745), median(cap, x, 1912)
        print(f"  x_jeu={x:>5} (x_réf={xr:>4})  réf {str(a):>16}  jeu {str(b):>16}  "
              f"Δ={max(abs(a[i]-b[i]) for i in range(3)):>4}")

    print("\n[ctrl positif] marge gauche en haut (f=0.05) : voir 1re lignes ci-dessus.")
    print("[ctrl négatif] point INTÉRIEUR au panneau, réf (200,1000) =",
          median(ref, 200, 1000), " jeu (200,700) =", median(cap, 200, 700),
          "(doit diverger des marges)")

    # palette quantifiée du panneau racine seul
    print("\n(c) PALETTE quantifiée du PANNEAU RACINE (16 couleurs, % d'aire)")
    for nom, im, box in (("réf", ref, (19, 377, 881, 1731)),
                         ("jeu", cap, (19, 19, 1061, 1901))):
        q = im.crop(box).resize((180, 300)).quantize(colors=16, method=Image.MEDIANCUT)
        pal = q.getpalette()
        cnt = sorted(q.getcolors(), reverse=True)
        tot = sum(c for c, _ in cnt)
        print(f"  --- {nom} ---")
        for c, idx in cnt[:8]:
            print(f"      {100*c/tot:5.1f}%  ({pal[3*idx]},{pal[3*idx+1]},{pal[3*idx+2]})")


main()
