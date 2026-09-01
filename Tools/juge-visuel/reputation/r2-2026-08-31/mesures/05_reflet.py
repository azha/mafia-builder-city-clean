#!/usr/bin/env python3
"""05 — Le reflet : le filet horizontal turquoise qui traverse le panneau CORPS.

C'est le trait d'identité de l'écran (« Le miroir ») : une glace passe devant le
lieutenant. On le cherche par sa signature de teinte (B > R, G > R) sur une ligne
entière, et non par une couleur exacte — un dégradé de bout en bout l'éteint aux
extrémités.

Contrôle positif : la ligne EXISTE dans la référence et le script la trouve, avec
sa position, son épaisseur et son étendue.
Contrôle négatif : le script balaie les 1920 lignes de la capture et rend le
meilleur score obtenu — s'il ne trouve rien, ce n'est pas faute d'avoir cherché.
"""
from PIL import Image
import os

D = os.path.dirname(__file__)
REF = os.path.join(D, "..", "reference", "m-120.png")
CAPS = ["/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png",
        "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png"]


def turquoise(p):
    """teinte du reflet : bleu-vert franc sur fond sombre, hors gris et hors or."""
    return p[2] > p[0] + 20 and p[1] > p[0] + 12 and 30 < p[0] < 120


def scan(im, scale, label, y0, y1, x0, x1):
    px = im.load()
    print(f"  {label}  (balayage y {y0/scale:.0f}->{y1/scale:.0f} CSS, "
          f"x {x0/scale:.0f}->{x1/scale:.0f} CSS)")
    best = (0, None)
    lignes = []
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if turquoise(px[x, y]))
        if n > best[0]:
            best = (n, y)
        if n > 0.30 * (x1 - x0):
            lignes.append((y, n))
    print(f"    meilleure ligne : y={best[1]/scale if best[1] else 0:.1f} CSS, "
          f"{best[0]} px turquoise sur {x1-x0} ({best[0]*100/(x1-x0):.1f} %)")
    if not lignes:
        print("    -> AUCUNE ligne ne dépasse 30 % : le reflet est ABSENT.")
        return
    ya, yb = lignes[0][0], lignes[-1][0]
    y = (ya + yb) // 2
    xs = [x for x in range(x0, x1) if turquoise(px[x, y])]
    print(f"    -> reflet PRÉSENT : y {ya/scale:.1f}->{yb/scale:.1f} CSS "
          f"(épaisseur {(yb-ya+1)/scale:.1f}), x {min(xs)/scale:.1f}->{max(xs)/scale:.1f} CSS, "
          f"couleur au centre {px[(min(xs)+max(xs))//2, y]}")


def main():
    r = Image.open(REF).convert("RGB")
    print(f"REF {os.path.basename(REF)} {r.size}")
    # panneau CORPS de la référence : y 236.0 -> 447.3 CSS, x 14 -> 285.7 CSS
    scan(r, 3.0, "RÉFÉRENCE m-120", 708, 1342, 45, 857)
    for cap in CAPS:
        c = Image.open(cap).convert("RGB")
        print(f"\nCAP {os.path.basename(cap)} {c.size}")
        # on balaie TOUTE la hauteur, pas seulement le corps : si le reflet a été
        # posé sur le mauvais élément, il faut le trouver là où il est.
        scan(c, 3.6, "JEU (image entière)", 0, c.size[1], 46, 1033)


if __name__ == "__main__":
    main()
