#!/usr/bin/env python3
"""01 — Instrument de segmentation de texte (sert a P1, P7, P8, P9, P11, P13).

Donne, pour une fenetre d'image :
  - les BANDES de lignes de texte (profil d'encre par ligne, fond = mediane de la fenetre)
  - dans chaque bande, les LETTRES (profil par colonne) avec leur bbox et leur hauteur
  - la hauteur de CAPITALE = hauteur de la 1re lettre quand c'est une majuscule a sommet plat
  - l'epaisseur de TRAIT (graisse) = mediane des longueurs de segments d'encre horizontaux

Controle positif  : la largeur de la fenetre lue est reimprimee ; la taille de chaque image est imprimee.
Controle negatif  : on segmente un bloc de fond pur -> doit rendre 0 bande.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *

def fond(im, box):
    (r, g, b), _ = med(im, *box)
    return (r, g, b)

def masque(im, box, seuil=28):
    """Renvoie (W,H,bits) : bits[y][x] True si le pixel s'ecarte du fond de >seuil (somme abs canaux/3)."""
    x0, y0, x1, y1 = box
    c = im.crop(box)
    W, H = c.size
    px = list(c.getdata())
    # fond = mode approx : mediane de l'ensemble (le texte est minoritaire)
    fr = sorted(p[0] for p in px)[len(px) // 2]
    fg = sorted(p[1] for p in px)[len(px) // 2]
    fb = sorted(p[2] for p in px)[len(px) // 2]
    bits = []
    for y in range(H):
        row = []
        base = y * W
        for x in range(W):
            p = px[base + x]
            d = (abs(p[0] - fr) + abs(p[1] - fg) + abs(p[2] - fb)) / 3.0
            row.append(d > seuil)
        bits.append(row)
    return W, H, bits, (fr, fg, fb)

def bandes(bits, W, H, mini=2, gap=4):
    """Bandes de lignes : suites de rangees ayant >= mini pixels d'encre, separees par >= gap rangees vides."""
    prof = [sum(1 for v in r if v) for r in bits]
    out, cur = [], None
    vide = 0
    for y in range(H):
        if prof[y] >= mini:
            if cur is None:
                cur = [y, y]
            else:
                cur[1] = y
            vide = 0
        else:
            if cur is not None:
                vide += 1
                if vide >= gap:
                    out.append(tuple(cur)); cur = None; vide = 0
    if cur is not None:
        out.append(tuple(cur))
    return out, prof

def lettres(bits, W, y0, y1, gapc=2, mini=1):
    """Segmentation en colonnes dans la bande [y0,y1]."""
    prof = [sum(1 for y in range(y0, y1 + 1) if bits[y][x]) for x in range(W)]
    out, cur, vide = [], None, 0
    for x in range(W):
        if prof[x] >= mini:
            if cur is None:
                cur = [x, x]
            else:
                cur[1] = x
            vide = 0
        else:
            if cur is not None:
                vide += 1
                if vide >= gapc:
                    out.append(tuple(cur)); cur = None; vide = 0
    if cur is not None:
        out.append(tuple(cur))
    # bbox verticale propre a chaque lettre
    res = []
    for a, b in out:
        ys = [y for y in range(y0, y1 + 1) if any(bits[y][x] for x in range(a, b + 1))]
        if ys:
            res.append((a, b, ys[0], ys[-1]))
    return res

def graisse(bits, W, y0, y1, x0, x1):
    """Mediane des longueurs de segments horizontaux d'encre (epaisseur de fut)."""
    L = []
    for y in range(y0, y1 + 1):
        n = 0
        for x in range(x0, x1 + 1):
            if bits[y][x]:
                n += 1
            else:
                if n:
                    L.append(n)
                n = 0
        if n:
            L.append(n)
    L.sort()
    return (L[len(L) // 2] if L else 0), len(L)

if __name__ == "__main__":
    im = ouvrir("ref", "E03-cadre-48")
    box = (40, 430, 1040, 620)
    W, H, bits, f = masque(im, box)
    print("  fenetre", box, "->", (W, H), "fond median", f)
    bs, prof = bandes(bits, W, H)
    print("  bandes (y absolu) :", [(box[1] + a, box[1] + b, b - a + 1) for a, b in bs])
    for a, b in bs:
        ls = lettres(bits, W, a, b)
        print(f"   bande y={box[1]+a}..{box[1]+b} : {len(ls)} groupes, 1er = x{box[0]+ls[0][0]}..{box[0]+ls[0][1]} h={ls[0][3]-ls[0][2]+1}")
    print("=== CONTROLE NEGATIF : fenetre de fond pur (ciel, 100..300 / 300..360) ===")
    W2, H2, bits2, f2 = masque(im, (100, 300, 300, 360))
    bs2, _ = bandes(bits2, W2, H2)
    print("  bandes trouvees :", len(bs2), "(attendu 0)")
