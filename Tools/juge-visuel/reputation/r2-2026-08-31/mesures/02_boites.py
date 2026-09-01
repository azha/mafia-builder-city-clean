#!/usr/bin/env python3
"""02 — Boîtes, marges intérieures et rythme vertical, en px CSS.

Instrument : profils de ligne / de colonne. On lit l'ENCRE (le liseré, le filet),
jamais un rectangle supposé.

Contrôle positif : la largeur de la carte-portrait, que je sais égale (elle est
donnée par le même partage de colonne des deux côtés).
Contrôle négatif : la hauteur de la carte-portrait, que je sais différente.
"""
from PIL import Image
import os

D = os.path.dirname(__file__)
REF = os.path.join(D, "..", "reference", "m-120.png")
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
S_REF, S_CAP = 3.0, 3.6

LISERE_REF, LISERE_CAP = (42, 54, 72), (42, 53, 73)
OR = (176, 141, 62)


def transitions(im, y, scale, seuil=9):
    px = im.load()
    w = im.size[0]
    out, prev = [], None
    for x in range(w):
        p = px[x, y]
        if prev is None or max(abs(a - b) for a, b in zip(p, prev)) > seuil:
            out.append((round(x / scale, 1), p))
            prev = p
    return out


def vruns(im, x, scale, col, tol=12):
    px = im.load()
    h = im.size[1]
    runs, cur = [], None
    for y in range(h):
        if max(abs(a - b) for a, b in zip(px[x, y], col)) < tol:
            cur = (y, y) if cur is None else (cur[0], y)
        else:
            if cur:
                runs.append((round(cur[0] / scale, 1), round(cur[1] / scale, 1)))
            cur = None
    if cur:
        runs.append((round(cur[0] / scale, 1), round(cur[1] / scale, 1)))
    return runs


def main():
    r = Image.open(REF).convert("RGB")
    c = Image.open(CAP).convert("RGB")
    print(f"REF {os.path.basename(REF)} {r.size}   CAP {os.path.basename(CAP)} {c.size}")

    print("\n[A] Rangée des trois compteurs — profil horizontal (px CSS)")
    print("  REF y=213 CSS :", transitions(r, 640, S_REF))
    print("  CAP y= 89 CSS :", [t for t in transitions(c, 320, S_CAP)
                                if t[1] in (LISERE_CAP, (13, 13, 22), OR, (176, 141, 61))])

    print("\n[B] Colonne du corps — profil horizontal au travers des tuiles-règles")
    print("  REF y=356.7 CSS :", transitions(r, 1070, S_REF))
    print("  CAP y=220.8 CSS :", transitions(c, 795, S_CAP))

    print("\n[C] Rythme vertical — bord gauche des grands blocs (liseré)")
    print("  REF x=14.0 CSS :", vruns(r, 42, S_REF, LISERE_REF))
    print("  CAP x=12.8 CSS :", vruns(c, 46, S_CAP, LISERE_CAP))

    print("\n[D] Tuiles-règles — bord gauche")
    print("  REF x=153.7 CSS :", vruns(r, 461, S_REF, LISERE_REF))
    print("  CAP x=148.9 CSS :", vruns(c, 536, S_CAP, LISERE_CAP))

    print("""
[LECTURE — reportée dans le rapport]
  carte-portrait, LARGEUR    réf  23.0->140.7 = 117.7 | jeu  20.0->137.7 = 117.7   [CONTRÔLE POSITIF]
  carte-portrait, HAUTEUR    réf 244.0->426.3 = 182.3 | jeu 120.8->373.1 = 252.2   [CONTRÔLE NÉGATIF]
  panneau CORPS, largeur     réf  14.0->285.7 = 271.7 | jeu  12.8->287.0 = 274.2
  padding intérieur du CORPS réf gauche 9.0 / droite 9.0 | jeu gauche 7.2 / droite 6.9
  padding CORPS haut/bas     réf 8.0 / 21.0            | jeu 5.2 / 5.5
  tuiles-règles, largeur     réf 151.0->276.0 = 125.0  | jeu 148.1->279.2 = 131.1
  tuiles-règles, hauteur     réf 28.0 (x4, égales)     | jeu 25.0 (x4, égales)
  gouttière carte<->tuiles   réf 10.3                  | jeu 10.4
  compteurs, largeur         réf 85.7/85.6/85.7        | jeu 86.6/86.4/86.4
  compteurs, gouttière       réf 7.0                   | jeu 7.0 / 6.9
  compteurs, hauteur         réf 31.7                  | jeu 28.7
  bandeau-titre, hauteur     réf 51.7                  | jeu 48.6
  bandeau-titre, liseré      réf (42,54,72) PRÉSENT    | jeu ABSENT (aplat nu)
  épilogue, hauteur          réf 76.0                  | jeu 70.9
  CTA, hauteur               réf 26.0                  | jeu 24.2
  écarts entre blocs         réf 9.3 / 9.3 / 9.4 / 9.3 | jeu 10.8 / 12.5 / 12.2 / 10.8
    (filet->compteurs, compteurs->corps, corps->épilogue, épilogue->CTA)
""")


if __name__ == "__main__":
    main()
