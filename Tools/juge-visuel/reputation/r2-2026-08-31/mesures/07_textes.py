#!/usr/bin/env python3
"""07 — Textes : hauteur de capitale, interlignes, étendue de l'encre.

On mesure la HAUTEUR DE CAPITALE (l'encre que l'oeil voit), jamais une taille
nominale, et on la ramène en px CSS. Un écart de FAMILLE de police n'est pas
mesurable ici : il relève de l'arbitrage, il est signalé mais pas chiffré.

Contrôle positif : le titre « Le miroir » et le H2 de l'épilogue, dont je sais
qu'ils sont à la bonne taille.
Contrôle négatif : le sous-titre du bandeau, dont l'oeil dit qu'il est trop gros.
"""
from PIL import Image
import os

D = os.path.dirname(__file__)
REF = os.path.join(D, "..", "reference", "m-120.png")
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def lignes(im, box, scale, seuil=70, gap=1):
    """groupes de lignes d'encre -> (haut, bas, hauteur) en px CSS"""
    px = im.load()
    rows = [y for y in range(box[1], box[3])
            if any(sum(px[x, y]) / 3 > seuil for x in range(box[0], box[2]))]
    if not rows:
        return []
    g, cur = [], [rows[0]]
    for y in rows[1:]:
        if y - cur[-1] <= gap:
            cur.append(y)
        else:
            g.append(cur)
            cur = [y]
    g.append(cur)
    return [(round(a[0] / scale, 1), round(a[-1] / scale, 1),
             round((a[-1] - a[0] + 1) / scale, 1)) for a in g]


def etendue(im, box, scale, seuil=90):
    px = im.load()
    xs = [x for x in range(box[0], box[2])
          if any(sum(px[x, y]) / 3 > seuil for y in range(box[1], box[3]))]
    return (round(min(xs) / scale, 1), round(max(xs) / scale, 1)) if xs else None


def main():
    r = Image.open(REF).convert("RGB")
    c = Image.open(CAP).convert("RGB")
    print(f"REF {os.path.basename(REF)} {r.size}   CAP {os.path.basename(CAP)} {c.size}")

    blocs = [
        ("titre « Le miroir »",         (30, 400, 870, 480),  (40, 46, 1040, 145)),
        ("sous-titre du bandeau",       (30, 480, 870, 545),  (40, 150, 1040, 200)),
        ("compteur « 00 » + libellé",   (50, 580, 290, 690),  (50, 270, 350, 380)),
        ("épilogue (4 blocs de texte)", (60, 1370, 850, 1580), (60, 1420, 1030, 1640)),
    ]
    print("\n[HAUTEURS DE CAPITALE et INTERLIGNES] (haut, bas, hauteur) en px CSS")
    for nom, br, bc in blocs:
        print(f"  {nom}")
        print("    réf :", lignes(r, br, 3.0))
        print("    jeu :", lignes(c, bc, 3.6))

    print("\n[ÉTENDUE DE L'ENCRE] px CSS")
    print("  titre       réf", etendue(r, (30, 420, 870, 480), 3.0),
          " jeu", etendue(c, (40, 70, 1040, 145), 3.6))
    print("  sous-titre  réf", etendue(r, (30, 485, 870, 512), 3.0),
          "(1re ligne sur 2)  jeu", etendue(c, (50, 155, 1032, 190), 3.6), "(1 seule ligne)")
    print("  plaque du bandeau : réf 14.0 -> 285.0    jeu 12.8 -> 287.2")

    print("""
[LECTURE — reportée dans le rapport]
  titre « Le miroir »          réf capitale 13.3  jeu 12.8   -3,8 %   [CONTRÔLE POSITIF]
  H2 « Rien n'a encore… »      réf capitale 11.0  jeu 10.8   -1,8 %   [CONTRÔLE POSITIF]
  compteur « 00 »              réf capitale 11.0  jeu 10.8   -1,8 %   [CONTRÔLE POSITIF]
  corps de l'épilogue          réf capitale  6.7  jeu 6.7/6.9         [CONTRÔLE POSITIF]
  sous-titre du bandeau        réf capitale  4.7  jeu  6.1  +30 %     [CONTRÔLE NÉGATIF]
  interligne du corps épilogue réf 9.4            jeu 7.5 / 7.8  -19 %
  sous-titre : réf 2 lignes centrées, marge 27.3 CSS de chaque côté
               jeu 1 ligne, marges 3.9 / 4.1 CSS -> 97 % de la plaque occupés
""")


if __name__ == "__main__":
    main()
