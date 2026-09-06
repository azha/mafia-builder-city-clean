#!/usr/bin/env python3
"""INSTRUMENT 7 — localiser un objet isole (la piece au sol de E3) et chiffrer l'ecart
entre l'or REELLEMENT employe et les jetons dores du canon.

Composantes connexes 4-voisins sur le masque « encre ocre », dans une fenetre donnee.
"""
import os, sys
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OCRE = (176, 141, 62)
CANON_DORE = {"or": (0xd9, 0xab, 0x4e), "or-vif": (0xf2, 0xc9, 0x6b), "laiton": (0xb0, 0x8d, 0x3e),
              "creme-2": (0xb9, 0xad, 0x92)}


def composantes(im, box, cible, tol=14, mini=40):
    x0, y0, x1, y1 = box
    px = im.load()
    W, H = x1-x0, y1-y0
    vu = bytearray(W*H)
    res = []
    for j in range(H):
        for i in range(W):
            if vu[j*W+i]:
                continue
            c = px[x0+i, y0+j]
            if max(abs(c[k]-cible[k]) for k in range(3)) > tol:
                vu[j*W+i] = 1; continue
            pile = [(i, j)]; vu[j*W+i] = 1; pts = []
            while pile:
                a, b = pile.pop(); pts.append((a, b))
                for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    na, nb = a+da, b+db
                    if 0 <= na < W and 0 <= nb < H and not vu[nb*W+na]:
                        cc = px[x0+na, y0+nb]
                        if max(abs(cc[k]-cible[k]) for k in range(3)) <= tol:
                            vu[nb*W+na] = 1; pile.append((na, nb))
                        else:
                            vu[nb*W+na] = 1
            if len(pts) >= mini:
                xs = [p[0]+x0 for p in pts]; ys = [p[1]+y0 for p in pts]
                res.append((len(pts), (min(xs), min(ys), max(xs), max(ys))))
    return sorted(res, reverse=True)


def controle_positif():
    print("== CONTROLE POSITIF ==")
    im = Image.new("RGB", (300, 300), (22, 28, 43))
    im.paste(Image.new("RGB", (40, 20), OCRE), (100, 200))   # tache connue 40x20 = 800 px a (100,200)
    im.paste(Image.new("RGB", (5, 5), OCRE), (10, 10))       # sous le plancher mini=40 : doit etre IGNOREE
    r = composantes(im, (0, 0, 300, 300), OCRE)
    ok = len(r) == 1 and r[0][0] == 800 and r[0][1] == (100, 200, 139, 219)
    print(f"  synthetique {im.size} -> {len(r)} composante(s) : {r} [attendu 1 de 800 px, boite (100,200,139,219)] -> {'OK' if ok else 'ECHEC'}")
    return ok


if __name__ == "__main__":
    if not controle_positif():
        sys.exit("controle positif en echec")
    im = Image.open(os.path.join(BASE, "vide-coffre.png")).convert("RGB")
    print(f"\n== E3 vide-coffre.png {im.size} : objets ocre isoles sur le SOL a gauche du coffre (x 0..330, y 860..1010) ==")
    for n, b in composantes(im, (0, 860, 330, 1010), OCRE)[:5]:
        print(f"   composante de {n} px, boite x={b[0]}..{b[2]} y={b[1]}..{b[3]} "
              f"({b[2]-b[0]+1}x{b[3]-b[1]+1} px, soit {(b[2]-b[0]+1)/im.size[0]*100:.1f} % de la largeur)")
    print("\n== L'OR EMPLOYE vs les jetons dores du canon (ecart Tchebychev par canal) ==")
    for nom, t in CANON_DORE.items():
        d = tuple(OCRE[i]-t[i] for i in range(3))
        print(f"   #b08d3e (employe) vs --{nom:<8} #{t[0]:02x}{t[1]:02x}{t[2]:02x} : delta={d} max={max(abs(v) for v in d)}")
