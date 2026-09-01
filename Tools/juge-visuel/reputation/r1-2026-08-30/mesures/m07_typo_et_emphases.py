#!/usr/bin/env python3
"""m07 — hauteurs de capitale, graisse, et EMPHASES du paragraphe explicatif.

(a) hauteur de capitale : bbox verticale de l'encre d'une capitale isolée, en px et
    en px CSS (réf /3,0 ; capture /3,6) -> comparable.
(b) emphases : la maquette met deux fragments en gras (« rien pris de vous » en clair,
    « indéterminé » en or). On compte, dans le rectangle du paragraphe, les pixels
    d'une couleur CLAIRE et les pixels OR ; s'ils manquent en jeu, l'emphase a sauté.

Contrôle positif : le liseré or (176,141,62) est présent des deux côtés — le compteur
d'or du bloc CTA doit être non nul dans les deux images.
Contrôle négatif : on compte l'or dans le paragraphe de la CAPTURE ; si l'instrument
comptait n'importe quoi, il en trouverait aussi.
"""
from PIL import Image


def encre_bbox(path, box, fond, tol, nom, echelle):
    im = Image.open(path).convert("RGB")
    px = im.load(); W, H = im.size
    x0, y0, x1, y1 = box
    ys = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = px[x, y]
            if any(abs(c[i] - fond[i]) > tol for i in range(3)):
                ys.append(y); break
    if not ys:
        print(f"  !! {nom}: pas d'encre"); return
    h = max(ys) - min(ys) + 1
    print(f"  {nom} [{path.split('/')[-1]} {W}x{H}] y {min(ys)}..{max(ys)}  h={h} px = {h/echelle:.1f} CSS")


def compte(path, box, cible, tol, nom):
    im = Image.open(path).convert("RGB")
    px = im.load(); W, H = im.size
    x0, y0, x1, y1 = box
    n = sum(1 for y in range(y0, y1) for x in range(x0, x1)
            if all(abs(px[x, y][i] - cible[i]) <= tol for i in range(3)))
    print(f"  {nom} [{path.split('/')[-1]} {W}x{H}] : {n} px proches de {cible} (tol {tol})")
    return n


REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-120.png"
C19 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
OR = (176, 141, 62)

if __name__ == "__main__":
    print("--- hauteur de capitale : le « L » de « Le miroir » ---")
    encre_bbox(REF, (272, 415, 320, 480), (11, 17, 27), 30, "REF L", 3.0)
    encre_bbox(C19, (352, 70, 400, 140), (13, 22, 34), 30, "CAP L", 3.6)

    print("\n--- hauteur de capitale : le « R » de « RÈGLES DONNÉES » (compteur 1) ---")
    encre_bbox(REF, (73, 648, 92, 672), (12, 19, 27), 25, "REF R", 3.0)
    encre_bbox(C19, (123, 345, 145, 372), (13, 13, 23), 25, "CAP R", 3.6)

    print("\n--- hauteur des chiffres « 00 » du 1er compteur ---")
    encre_bbox(REF, (140, 595, 210, 645), (12, 19, 27), 30, "REF 00", 3.0)
    encre_bbox(C19, (200, 275, 265, 335), (13, 13, 23), 30, "CAP 00", 3.6)

    print("\n--- EMPHASES du paragraphe explicatif ---")
    print("  (contrôle positif : l'or existe des deux côtés, mesuré sur le liseré du CTA)")
    compte(REF, (42, 1608, 880, 1616), OR, 40, "REF or (liseré CTA)")
    compte(C19, (46, 1438, 1060, 1448), OR, 40, "CAP or (liseré CTA)")
    print("  paragraphe :")
    # réf : y 1450..1580 ; capture : y 1285..1375
    compte(REF, (72, 1440, 830, 1590), OR, 45, "REF or dans le paragraphe")
    compte(C19, (80, 1280, 1000, 1380), OR, 45, "CAP or dans le paragraphe")
    compte(REF, (72, 1440, 830, 1590), (232, 236, 241), 30, "REF clair (gras) dans le paragraphe")
    compte(C19, (80, 1280, 1000, 1380), (232, 236, 241), 30, "CAP clair (gras) dans le paragraphe")
