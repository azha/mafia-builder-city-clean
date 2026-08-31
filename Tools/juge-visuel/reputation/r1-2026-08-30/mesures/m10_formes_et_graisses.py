#!/usr/bin/env python3
"""m10 — les grandeurs restantes du rapport, chacune avec son instrument.

(a) VOYANTS : profils vertical/horizontal pris À L'INTÉRIEUR de la carte (les fenêtres
    de m05/m06 touchaient le liseré, de même couleur : cette version ne le touche pas).
(b) MONTRE : rectangle ou ellipse ? -> on lit la largeur de l'objet à trois hauteurs ;
    constante = rectangle, variable = ellipse.
(c) CARTES DE RÈGLES : extension verticale, hauteur et gouttière.
(d) EMPHASES du paragraphe : présence de l'or (242,201,107).
(e) GRAISSE des titres : densité d'encre dans la bbox du texte (invariant d'échelle),
    à hauteur de capitale égale.
(f) AXE du portrait : centre de la carte, du visage, du cou, du revers.

Contrôle positif : la hauteur de capitale des mêmes textes est ÉGALE des deux côtés
(m07) — donc une densité d'encre différente n'est pas un effet de taille.
Contrôle négatif : (b) appliqué à la référence doit sortir des largeurs VARIABLES,
et appliqué à la capture des largeurs CONSTANTES ; si les deux sortaient pareil,
l'instrument ne discriminerait pas.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-120.png"
C19 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def ouvrir(p):
    im = Image.open(p).convert("RGB")
    print(f"  [{p.split('/')[-1]} {im.size}]")
    return im, im.load()


def largeur(px, y, xr, cible, tol):
    h = [x for x in xr if all(abs(px[x, y][i] - cible[i]) <= tol for i in range(3))]
    return (min(h), max(h), max(h) - min(h) + 1) if h else None


def hauteur(px, x, yr, cible, tol):
    h = [y for y in yr if all(abs(px[x, y][i] - cible[i]) <= tol for i in range(3))]
    return (min(h), max(h), max(h) - min(h) + 1) if h else None


def segments(px, x, H, cible, tol, mini=10):
    ys = [y for y in range(H) if all(abs(px[x, y][i] - cible[i]) <= tol for i in range(3))]
    segs, d, p = [], None, None
    for y in ys:
        if d is None:
            d = y
        elif y != p + 1:
            segs.append((d, p)); d = y
        p = y
    if d is not None:
        segs.append((d, p))
    return [s for s in segs if s[1] - s[0] >= mini]


def texte(im, px, box, fond, nom, ech):
    pts = [(x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2])
           if sum(abs(px[x, y][i] - fond[i]) for i in range(3)) > 60]
    mnx = min(p[0] for p in pts); mxx = max(p[0] for p in pts)
    mny = min(p[1] for p in pts); mxy = max(p[1] for p in pts)
    w = mxx - mnx + 1; h = mxy - mny + 1
    print(f"    {nom}: l={w/ech:6.1f} CSS  h(cap)={h/ech:5.1f} CSS  encre={len(pts):5d} px  "
          f"densité={100.0*len(pts)/(w*h):5.1f} %")


if __name__ == "__main__":
    print("(a) VOYANT de la 1re carte — rond (ratio 1) ou ovale ?")
    im, px = ouvrir(REF)
    print("    REF vertical  x=490 :", hauteur(px, 490, range(845, 912), (40, 51, 69), 16))
    print("    REF horizontal y=876 :", largeur(px, 876, range(462, 518), (40, 51, 69), 16))
    im, px = ouvrir(C19)
    for x in (566, 570, 574, 578, 582):
        print(f"    CAP vertical  x={x} :", hauteur(px, x, range(578, 676), (42, 53, 73), 16))
    for y in (600, 616, 630):
        print(f"    CAP horizontal y={y} :", largeur(px, y, range(545, 608), (42, 53, 73), 16))

    print("\n(b) MONTRE — largeur à trois hauteurs (constante = rectangle)")
    im, px = ouvrir(REF)
    for y in (1155, 1161, 1168):
        print(f"    REF y={y} :", largeur(px, y, range(120, 300), (35, 42, 45), 8))
    im, px = ouvrir(C19)
    for y in (960, 970, 980):
        print(f"    CAP y={y} :", largeur(px, y, range(120, 300), (34, 42, 46), 8))

    print("\n(c) CARTES DE RÈGLES — extension verticale (liseré gauche)")
    im, px = ouvrir(REF)
    s = segments(px, 454, im.size[1], (42, 54, 72), 10)
    print("    REF :", s, " -> hauteurs CSS", [round((b-a+1)/3.0, 1) for a, b in s])
    im, px = ouvrir(C19)
    s = segments(px, 534, im.size[1], (42, 53, 73), 10)
    print("    CAP :", s, " -> hauteurs CSS", [round((b-a+1)/3.6, 1) for a, b in s])

    print("\n(d) EMPHASES du paragraphe — pixels OR (242,201,107)")
    for p, box in ((REF, (72, 1480, 830, 1590)), (C19, (80, 1285, 1000, 1375))):
        im, px = ouvrir(p)
        n = sum(1 for y in range(box[1], box[3]) for x in range(box[0], box[2])
                if all(abs(px[x, y][i] - (242, 201, 107)[i]) <= 20 for i in range(3)))
        print(f"    or dans {box} : {n} px")

    print("\n(e) GRAISSE des titres — densité d'encre à hauteur de capitale égale")
    im, px = ouvrir(REF)
    texte(im, px, (140, 1185, 360, 1230), (17, 24, 35), "REF « Il vous écoute »", 3.0)
    texte(im, px, (120, 415, 790, 480), (11, 17, 27), "REF « Le miroir »      ", 3.0)
    texte(im, px, (60, 1425, 720, 1480), (17, 24, 35), "REF titre de la note   ", 3.0)
    im, px = ouvrir(C19)
    texte(im, px, (160, 995, 420, 1045), (13, 22, 34), "JEU « Il vous écoute »", 3.6)
    texte(im, px, (300, 70, 800, 145), (13, 22, 34), "JEU « Le miroir »      ", 3.6)
    texte(im, px, (70, 1225, 720, 1285), (13, 22, 34), "JEU titre de la note   ", 3.6)

    print("\n(f) AXE du portrait — centres (px, puis en % de la largeur d'image)")
    for p, W, carte, visage, cou, revers in (
            (REF, 900, (69, 422), (194, 297), (223, 268), (221, 270)),
            (C19, 1080, (72, 496), (204, 342), (245, 300), (251, 328))):
        c = lambda t: (t[0] + t[1]) / 2.0
        print(f"    [{p.split('/')[-1]}] carte={c(carte):.1f}  visage={c(visage):.1f}  "
              f"cou={c(cou):.1f}  revers={c(revers):.1f}   "
              f"revers-cou = {100.0*(c(revers)-c(cou))/W:+.2f} %L   "
              f"visage-carte = {100.0*(c(visage)-c(carte))/W:+.2f} %L")
