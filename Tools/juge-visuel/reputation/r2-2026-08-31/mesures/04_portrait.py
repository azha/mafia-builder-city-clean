#!/usr/bin/env python3
"""04 — Le portrait du lieutenant : les cinq traits porteurs de donnée.

Repère : origine au coin haut-gauche INTÉRIEUR de la carte-portrait, unité px CSS.
La carte a la MÊME largeur des deux côtés (117,7 CSS, cf. 02) : les x sont donc
directement comparables, sans renormalisation.

Instruments :
  - bbox + aire par classe de couleur (les aplats du portrait sont purs) ;
  - TAUX DE REMPLISSAGE aire/bbox : ~0,50 = triangle, ~1,00 = rectangle,
    ~0,79 = disque. C'est lui qui tranche la FORME sans reconnaître de forme ;
  - profil de largeur d'encre ligne à ligne, pour la silhouette.

Contrôle positif : la couleur des trois aplats (visage, col, buste) doit sortir
identique — ce sont des tokens recopiés.
Contrôle négatif : le taux de remplissage du col, dont l'oeil dit qu'il diffère.
"""
from PIL import Image
import os

D = os.path.dirname(__file__)
REF = os.path.join(D, "..", "reference", "m-120.png")
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"

# coin intérieur de la carte-portrait, en px d'image (cf. 02_boites)
O_REF, S_REF, BOX_REF = (69, 732), 3.0, (72, 735, 420, 1277)
O_CAP, S_CAP, BOX_CAP = (72, 435), 3.6, (76, 440, 494, 1340)

VISAGE = (185, 173, 146)
COL = (234, 224, 200)
BUSTE = (22, 24, 28)

LARG_CARTE = 117.7          # px CSS, identique des deux côtés
AXE = LARG_CARTE / 2        # 58,85 : l'axe de symétrie de la carte


def classe(im, box, col, tol, o, s, label):
    px = im.load()
    X, Y, n = [], [], 0
    for x in range(box[0], box[2]):
        for y in range(box[1], box[3]):
            if max(abs(a - b) for a, b in zip(px[x, y], col)) <= tol:
                X.append(x)
                Y.append(y)
                n += 1
    if not X:
        print(f"  {label:20s} ABSENT")
        return None
    x0, x1 = (min(X) - o[0]) / s, (max(X) - o[0]) / s
    y0, y1 = (min(Y) - o[1]) / s, (max(Y) - o[1]) / s
    lar, hau, aire = x1 - x0, y1 - y0, n / s / s
    taux = aire / (lar * hau) if lar * hau else 0
    cx = (x0 + x1) / 2
    print(f"  {label:20s} x {x0:6.1f}->{x1:6.1f} (l {lar:5.1f})  y {y0:6.1f}->{y1:6.1f} "
          f"(h {hau:5.1f})  aire {aire:7.1f}  remplissage {taux:.2f}  "
          f"centre {cx:5.1f} (axe {AXE:.1f}, écart {cx-AXE:+.1f})")
    return dict(l=lar, h=hau, aire=aire, taux=taux, cx=cx)


def silhouette(im, box, fond, o, s, label, pas=3.0):
    """largeur d'encre (nb de px non-fond) ligne à ligne — la silhouette."""
    px = im.load()
    out = []
    y = box[1]
    while y < box[3]:
        n = sum(1 for x in range(box[0], box[2])
                if max(abs(a - b) for a, b in zip(px[x, y], fond)) > 7)
        out.append((round((y - o[1]) / s, 1), round(n / s, 1)))
        y += int(round(pas * s))
    print(f"  {label} (y CSS, largeur d'encre CSS) :")
    print("   ", "  ".join(f"{a:.0f}:{b:.0f}" for a, b in out))
    return out


def main():
    r = Image.open(REF).convert("RGB")
    c = Image.open(CAP).convert("RGB")
    print(f"REF {os.path.basename(REF)} {r.size}   CAP {os.path.basename(CAP)} {c.size}")

    res = {}
    for lab, im, box, o, s in (("RÉFÉRENCE", r, BOX_REF, O_REF, S_REF),
                               ("JEU", c, BOX_CAP, O_CAP, S_CAP)):
        print(f"\n[{lab}]  origine = coin de la carte-portrait")
        res[lab] = {
            "visage": classe(im, box, VISAGE, 12, o, s, "visage"),
            "col": classe(im, box, COL, 12, o, s, "col (crème)"),
        }
        # buste : bbox limitée à la zone du buste pour ne pas ramasser
        # l'anti-crénelage du libellé « SALVATORE » ni le liseré d'or de la carte
        b2 = (box[0] + int(6 * s), box[1] + int(35 * s), box[2] - int(6 * s), box[1] + int(150 * s))
        res[lab]["buste"] = classe(im, b2, BUSTE, 6, o, s, "buste + cheveux")

    print("\n[RAPPORTS INTERNES — invariants d'échelle]")
    a, b = res["RÉFÉRENCE"], res["JEU"]
    for nom, f in (("aire visage / aire buste", lambda d: d["visage"]["aire"] / d["buste"]["aire"]),
                   ("aire col / aire visage", lambda d: d["col"]["aire"] / d["visage"]["aire"]),
                   ("largeur col / largeur visage", lambda d: d["col"]["l"] / d["visage"]["l"]),
                   ("largeur visage / largeur buste", lambda d: d["visage"]["l"] / d["buste"]["l"])):
        va, vb = f(a), f(b)
        print(f"  {nom:32s} réf {va:.3f}   jeu {vb:.3f}   {(vb-va)/va*100:+.0f} %")

    print("\n[CONTRÔLE NÉGATIF] taux de remplissage du col "
          "(0,50 = triangle · 1,00 = rectangle)")
    print(f"  réf {a['col']['taux']:.2f}    jeu {b['col']['taux']:.2f}")

    print("\n[SILHOUETTE]")
    silhouette(r, (72, 855, 420, 1200), (17, 24, 35), O_REF, S_REF, "RÉF")
    silhouette(c, (76, 585, 490, 1000), (13, 22, 34), O_CAP, S_CAP, "JEU")

    print("\n[MONTRE — le cadran porte-t-il des aiguilles ?]")
    print("  On isole la bbox du cadran (35,42,45), puis on regarde le RECTANGLE")
    print("  CENTRAL (50 % de la bbox) : à l'intérieur d'une ellipse pleine il est")
    print("  100 % cadran ; toute encre plus sombre qui y traîne est une aiguille.")
    for lab, im, box, cadran, s in (("réf", r, (120, 1115, 205, 1200), (35, 42, 45), 3.0),
                                    ("jeu", c, (120, 915, 220, 972), (34, 42, 46), 3.6)):
        px = im.load()
        X, Y = [], []
        for x in range(box[0], box[2]):
            for y in range(box[1], box[3]):
                if max(abs(u - v) for u, v in zip(px[x, y], cadran)) <= 6:
                    X.append(x); Y.append(y)
        if not X:
            print(f"  {lab} : cadran ABSENT"); continue
        x0, x1, y0, y1 = min(X), max(X), min(Y), max(Y)
        qx, qy = (x1 - x0) // 4, (y1 - y0) // 4
        tot = sombre = 0
        for x in range(x0 + qx, x1 - qx + 1):
            for y in range(y0 + qy, y1 - qy + 1):
                tot += 1
                if cadran[1] - px[x, y][1] >= 8:
                    sombre += 1
        print(f"  {lab} : cadran {(x1-x0+1)/s:.1f} x {(y1-y0+1)/s:.1f} CSS ; "
              f"dans le carré central, {sombre}/{tot} px plus sombres que le cadran "
              f"= {sombre*100/tot:.1f} %")


if __name__ == "__main__":
    main()
