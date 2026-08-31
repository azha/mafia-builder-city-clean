#!/usr/bin/env python3
"""06 — Stabilité (T / T+1 s) et tenue à la seconde résolution (1080x2400).

Stabilité : différence pixel à pixel des deux captures 1080x1920. Le chrome
étant absent des deux, il n'y a RIEN à exclure du compte : tout pixel qui bouge
est un pixel de l'écran lui-même.

Tenue en 20:9 : on ne compare pas au pixel (l'image est plus haute) ; on vérifie
que rien n'est coupé, que rien ne sort du panneau, et que les proportions EN % DE
LA LARGEUR sont conservées.

Contrôle positif : la largeur du panneau d'or, qui doit être identique aux deux
résolutions (la largeur ne change pas).
Contrôle négatif : la hauteur de la carte-portrait, qui DOIT grandir en 20:9 —
c'est le bloc élastique ; si elle ne bougeait pas, quelque chose serait coupé.
"""
from PIL import Image, ImageChops
import os

DIR = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
A = DIR + "screen_b3_reputation_1080x1920.png"
B = DIR + "screen_b3_reputation_1080x1920_t1s.png"
C = DIR + "screen_b3_reputation_1080x2400.png"
S = 3.6


def bandes_or(im, scale):
    w, h = im.size
    px = im.load()

    def plus_longue(y):
        best = cur = 0
        for x in range(w):
            p = px[x, y]
            if p[0] > 140 and p[1] > 110 and p[2] < 110:
                cur += 1
                best = max(best, cur)
            else:
                cur = 0
        return best

    runs, cur = [], None
    for y in range(h):
        if plus_longue(y) > 0.20 * w:
            cur = (y, y) if cur is None else (cur[0], y)
        else:
            if cur:
                runs.append(cur)
            cur = None
    if cur:
        runs.append(cur)
    return [(a / scale, b / scale) for a, b in runs]


def bords_or(im, y, scale):
    px = im.load()
    xs = [x for x in range(im.size[0])
          if px[x, y][0] > 140 and px[x, y][1] > 110 and px[x, y][2] < 110]
    return (min(xs) / scale, max(xs) / scale) if xs else None


def main():
    a, b, c = (Image.open(p).convert("RGB") for p in (A, B, C))
    print(f"T    {os.path.basename(A)} {a.size}")
    print(f"T+1s {os.path.basename(B)} {b.size}")
    print(f"20:9 {os.path.basename(C)} {c.size}")

    print("\n[STABILITÉ]  aucune exclusion : le chrome est absent des deux images")
    d = ImageChops.difference(a, b)
    hist = d.convert("L").histogram()
    n = sum(hist[1:])
    print(f"  bbox des différences : {d.getbbox()}")
    print(f"  pixels différents : {n} / {a.size[0]*a.size[1]}")
    print(f"  delta maximal : {max(i for i, v in enumerate(hist) if v)}/255")
    print("  -> " + ("STABLE (aucune animation)" if n == 0 else "INSTABLE"))

    print("\n[20:9]  repères, px CSS")
    r19, r24 = bandes_or(a, S), bandes_or(c, S)
    noms = ["haut du panneau", "filet sous le titre", "haut carte-portrait",
            "bas carte-portrait", "haut CTA", "bas CTA", "bas du panneau"]
    for i, nom in enumerate(noms):
        if i < len(r19) and i < len(r24):
            print(f"  {nom:24s} 16:9 {r19[i][0]:7.1f}   20:9 {r24[i][0]:7.1f}")
    print(f"\n  hauteur carte-portrait   16:9 {r19[3][1]-r19[2][0]:7.1f}   "
          f"20:9 {r24[3][1]-r24[2][0]:7.1f}   [CONTRÔLE NÉGATIF : doit grandir]")
    print(f"  hauteur du panneau       16:9 {r19[6][1]-r19[0][0]:7.1f}   "
          f"20:9 {r24[6][1]-r24[0][0]:7.1f}")
    print(f"  hauteur d'image          16:9 {a.size[1]/S:7.1f}   20:9 {c.size[1]/S:7.1f}")
    print(f"  marge basse sous le CTA  16:9 {a.size[1]/S-r19[6][1]:7.1f}   "
          f"20:9 {c.size[1]/S-r24[6][1]:7.1f}")

    print("\n  largeur du panneau d'or  [CONTRÔLE POSITIF]")
    print(f"    16:9 {bords_or(a, 400, S)}    20:9 {bords_or(c, 400, S)}")

    print("\n[20:9 — rien de coupé ?] colonnes/lignes d'encre touchant le bord d'image")
    px = c.load()
    w, h = c.size
    bord = 0
    for x in range(w):
        for y in (0, 1, h - 2, h - 1):
            if sum(px[x, y]) / 3 > 45:
                bord += 1
    for y in range(h):
        for x in (0, 1, w - 2, w - 1):
            if sum(px[x, y]) / 3 > 45:
                bord += 1
    print(f"  pixels d'encre (L>45) sur les 2 px de bordure d'image : {bord}")

    print("\n[20:9 — le sous-titre déborde-t-il ?]")
    for lab, im, ybande in (("16:9", a, (155, 190)), ("20:9", c, (155, 190))):
        p = im.load()
        # on part de 50 px : en deçà on ramasse le liseré d'or du panneau
        xs = [x for x in range(50, 1032)
              for y in range(*ybande) if sum(p[x, y]) / 3 > 90]
        if xs:
            print(f"  {lab} : encre du sous-titre x {min(xs)/S:.1f} -> {max(xs)/S:.1f} CSS ; "
                  f"plaque 12.8 -> 287.2 ; marge gauche {min(xs)/S-12.8:.1f}, "
                  f"marge droite {287.2-max(xs)/S:.1f}")


if __name__ == "__main__":
    main()
