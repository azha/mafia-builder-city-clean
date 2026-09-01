#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 — le PORTRAIT (angle mort A7 déclaré).

Instrument : masque « silhouette » = tout pixel de la carte qui s'écarte du
fond de la carte (mesuré sur place, coin haut-gauche) de plus de 8/255 sur au
moins un canal. On mesure alors, en % de la CARTE (donc invariant d'échelle) :
bbox de la silhouette, profil de largeur par rangée, asymétrie gauche/droite.
Puis deux masques de teinte serrés (chair, blanc cassé du col) pour le visage,
le plastron et le col, et le remplissage aire/boîte du col.

CONTRÔLE POSITIF #1 : le masque « col » doit rendre un remplissage aire/boîte
proche de 0,41 sur la RÉFÉRENCE, où le col EST un triangle — c'est la valeur
que le dossier annonce (~0,43).
CONTRÔLE POSITIF #2 : la silhouette doit couvrir une aire non nulle et sa bbox
doit tenir dans la carte dans les deux images.
CONTRÔLE NÉGATIF : les deux masques appliqués à une fenêtre de fond PUR de la
carte (haut-gauche, 40x40) doivent rendre une aire nulle.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"

CARTE = {"REF": (72, 735, 420, 1277), "JEU": (75, 439, 493, 1058)}


def near(p, c, t):
    return all(abs(p[i] - c[i]) <= t for i in range(3))


def stats(im, box, pred):
    px = im.load()
    x0, y0, x1, y1 = box
    xs, ys, n = [], [], 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if pred(px[x, y]):
                xs.append(x); ys.append(y); n += 1
    if not n:
        return None
    return (min(xs), min(ys), max(xs), max(ys), n)


def main():
    for nom, path in (("REF", REF), ("JEU", CAP)):
        im = Image.open(path).convert("RGB")
        px = im.load()
        x0, y0, x1, y1 = CARTE[nom]
        W, H = x1 - x0, y1 - y0
        fond = px[x0 + 20, y0 + 20]
        print("=" * 74)
        print(f"{nom} {path} taille={im.size}")
        print(f"  carte ({x0},{y0})-({x1},{y1}) = {W}x{H} px ; fond de carte {fond}")

        SIL = lambda p: max(abs(p[i] - fond[i]) for i in range(3)) > 8
        CHAIR = lambda p: near(p, (185, 173, 146), 10)
        COL = lambda p: near(p, (234, 224, 200), 10)

        # on exclut les bandeaux de texte : « SALVATORE… » en haut, verdict en bas
        zone = (x0 + 3, y0 + int(0.16 * H), x1 - 3, y0 + int(0.83 * H))
        s = stats(im, zone, SIL)
        a, b, c, d, n = s
        px_ = lambda v, o, t: round(100.0 * (v - o) / t, 1)
        print(f"  silhouette : x {px_(a,x0,W)}%..{px_(c,x0,W)}%  "
              f"y {px_(b,y0,H)}%..{px_(d,y0,H)}%  aire={round(100*n/(W*H),2)}% de la carte")
        # asymétrie autour de l'axe de la carte
        cx = (x0 + x1) // 2
        g = stats(im, (x0 + 3, zone[1], cx, zone[3]), SIL)[4]
        dr = stats(im, (cx, zone[1], x1 - 3, zone[3]), SIL)[4]
        print(f"  asymétrie silhouette (G-D)/(G+D) = {round((g-dr)/(g+dr),3)}  (G={g} D={dr})")
        # profil de largeur par rangée, tous les 5 %
        print("  profil de largeur de la silhouette (par rangée, % de la carte) :")
        ligne = []
        for i in range(16, 84, 4):
            y = y0 + int(i / 100.0 * H)
            xs = [x for x in range(x0 + 3, x1 - 3) if SIL(px[x, y])]
            if xs:
                ligne.append(f"y{i}%: {px_(min(xs),x0,W)}..{px_(max(xs),x0,W)}"
                             f" (l={round(100*(max(xs)-min(xs)+1)/W)}%)")
            else:
                ligne.append(f"y{i}%: —")
        for j in range(0, len(ligne), 3):
            print("     " + " | ".join(ligne[j:j + 3]))

        for lib, pred, ctrlpos in (("chair (visage+plastron)", CHAIR, None),
                                   ("col (blanc cassé)", COL, 0.41)):
            m = stats(im, zone, pred)
            if not m:
                print(f"  {lib:24s} : ABSENT")
                continue
            a, b, c, d, n = m
            bw, bh = c - a + 1, d - b + 1
            r = round(n / (bw * bh), 3)
            print(f"  {lib:24s} : x {px_(a,x0,W)}%..{px_(c,x0,W)}%  "
                  f"y {px_(b,y0,H)}%..{px_(d,y0,H)}%  aire/boîte={r}"
                  + (f"   [ctrl positif : réf ≈ {ctrlpos}]" if ctrlpos else ""))

        print(f"  [ctrl négatif] silhouette sur fond pur (40x40 haut-gauche) : "
              f"{stats(im,(x0+6,y0+6,x0+46,y0+46),SIL)}  (attendu None)")
        print(f"  [ctrl négatif] chair sur fond pur : "
              f"{stats(im,(x0+6,y0+6,x0+46,y0+46),CHAIR)}  (attendu None)")


main()
