#!/usr/bin/env python3
"""INSTRUMENT 5 — le traitement de BORD : y a-t-il un cadre peint, et de quelle encre ?

A l'oeil, certaines des 12 portent un cadre clair « papier dechire » et d'autres non. C'est
une propriete de SERIE (les 12 se lisent-elles comme une main ?) et elle se mesure : on lit
l'anneau des 24 px exterieurs et on donne la part de chaque encre litterale qui l'occupe,
puis l'EPAISSEUR du cadre = la distance depuis le bord jusqu'a la premiere ligne/colonne
dont l'encre dominante redevient celle de l'interieur.

On mesure l'anneau ET une couronne interieure temoin (px 60..84) : sans le temoin, une image
majoritairement claire rendrait « cadre clair » sans avoir de cadre. C'est le controle qui
distingue un CADRE d'un simple bord clair.
"""
import os, sys
from PIL import Image

ANCRES = {"#161c2b": (22, 28, 43), "#2c3242": (44, 50, 66), "#b08d3e": (176, 141, 62), "#eae0c8": (234, 224, 200)}
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = sorted(f for f in os.listdir(BASE) if f.endswith(".png"))


def classe(c):
    return min(ANCRES.items(), key=lambda kv: sum((c[i]-kv[1][i])**2 for i in range(3)))[0]


def anneau(im, r0, r1):
    W, H = im.size; px = im.load()
    n = {k: 0 for k in ANCRES}
    for y in range(H):
        for x in range(W):
            d = min(x, y, W-1-x, H-1-y)
            if r0 <= d < r1:
                n[classe(px[x, y])] += 1
    t = sum(n.values())
    return {k: v/t*100 for k, v in n.items()}, t


def epaisseur_cadre(im, seuil=55.0):
    """distance depuis le bord jusqu'a la 1re couronne de 4 px ou l'encre CLAIRE tombe sous seuil %."""
    for d in range(0, 120, 4):
        p, _ = anneau(im, d, d+4)
        if p["#b08d3e"] + p["#eae0c8"] < seuil:
            return d
    return 120


def controle_positif():
    print("== CONTROLE POSITIF ==")
    W = H = 200
    im = Image.new("RGB", (W, H), (22, 28, 43))
    for y in range(H):
        for x in range(W):
            if min(x, y, W-1-x, H-1-y) < 16:
                im.putpixel((x, y), (234, 224, 200))
    p, t = anneau(im, 0, 24)
    e = epaisseur_cadre(im)
    print(f"  synthetique {im.size} cadre creme de 16 px pose : anneau 0..23 = "
          + " ".join(f"{k} {v:.0f}%" for k, v in p.items()) + f" ; epaisseur mesuree {e} px [attendu 16]")
    ok = e == 16 and p["#eae0c8"] > 60
    pi, _ = anneau(im, 60, 84)
    print(f"  temoin interieur 60..83 : #161c2b {pi['#161c2b']:.0f}% [attendu 100] -> {'OK' if pi['#161c2b'] == 100 else 'ECHEC'}")
    ok &= pi["#161c2b"] == 100
    # controle NEGATIF : une image SANS cadre (aplat sombre) doit rendre epaisseur 0
    e0 = epaisseur_cadre(Image.new("RGB", (W, H), (22, 28, 43)))
    print(f"  controle NEGATIF aplat sombre sans cadre -> epaisseur {e0} px [attendu 0] -> {'OK' if e0 == 0 else 'ECHEC'}")
    return ok and e0 == 0


if __name__ == "__main__":
    if not controle_positif():
        sys.exit("controle positif en echec")
    print("\n== BORD : anneau exterieur 0..23 px vs temoin interieur 60..83 px ==")
    print("    id  fichier                  taille    anneau 0..23 (part par encre)                       clair anneau / clair temoin  epaisseur cadre")
    for i, f in enumerate(IMAGES, 1):
        im = Image.open(os.path.join(BASE, f)).convert("RGB")
        p, _ = anneau(im, 0, 24); q, _ = anneau(im, 60, 84)
        ca = p["#b08d3e"] + p["#eae0c8"]; ct = q["#b08d3e"] + q["#eae0c8"]
        e = epaisseur_cadre(im)
        print(f"    E{i:<3}{f:<24} {im.size[0]}x{im.size[1]}  "
              + " ".join(f"{k}{p[k]:5.1f}%" for k in ANCRES)
              + f"   {ca:5.1f}% / {ct:5.1f}%   {e:3d} px")
