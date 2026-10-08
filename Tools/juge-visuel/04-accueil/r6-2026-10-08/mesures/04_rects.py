#!/usr/bin/env python3
"""04 — rectangles exacts des cartes par MASQUE de couleur de liseré.

Methode : un liseré de carte est un trait continu ; son bord HAUT et son bord BAS sont
des lignes de ~900 px de la meme couleur. On compte, pour chaque ligne y, le nombre de
pixels proches de la couleur de liseré ; les pics > 400 sont les bords horizontaux.
Le rayon se lit sur la ligne du bord haut (ou le trait commence en x).

CONTROLE POSITIF : la couleur de liseré est reprise de l'image elle-meme (pas d'un token),
et le compte sur une ligne de FOND doit etre ~0 (controle negatif imprime).
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, mediane_fenetre

LISERES = {
    "plaque": (33, 38, 48),   # .verre  (#ffffff17 sur le fond) — lu sur REF4 x=47,y=1000
    "file":   (42, 54, 72),   # .suivant (#2a3648)               — lu sur REF4 x=47,y=1660
}
TOL = 7


def masque_lignes(im, coul, tol=TOL):
    px = im.load()
    W, H = im.size
    cnt = [0] * H
    for y in range(H):
        n = 0
        for x in range(0, W):
            p = px[x, y]
            if abs(p[0]-coul[0]) <= tol and abs(p[1]-coul[1]) <= tol and abs(p[2]-coul[2]) <= tol:
                n += 1
        cnt[y] = n
    return cnt


def pics(cnt, seuil=400):
    bandes, cur = [], None
    for y, n in enumerate(cnt):
        if n >= seuil:
            if cur is None:
                cur = [y, y]
            else:
                cur[1] = y
        else:
            if cur is not None:
                bandes.append(tuple(cur))
                cur = None
    if cur:
        bandes.append(tuple(cur))
    return bandes


def extent_x(im, y, coul, tol=TOL):
    px = im.load()
    W = im.size[0]
    xs = [x for x in range(W)
          if abs(px[x, y][0]-coul[0]) <= tol and abs(px[x, y][1]-coul[1]) <= tol
          and abs(px[x, y][2]-coul[2]) <= tol]
    return (min(xs), max(xs)) if xs else (None, None)


print("=== 04 — rectangles par masque de liseré ===")
for cle in ("ref4", "ref5", "c24", "c19", "l24", "l19"):
    im = ouvrir(cle)
    W, H = im.size
    for nom, coul in LISERES.items():
        cnt = masque_lignes(im, coul)
        bandes = pics(cnt)
        if not bandes:
            print(f"   [{cle}] {nom:7s} : aucun bord horizontal (seuil 400)")
            continue
        # bords horizontaux consecutifs : premier = haut de la 1re carte, dernier = bas
        print(f"   [{cle}] {nom:7s} : bords horizontaux {bandes}")
        yh0, yh1 = bandes[0]
        yb0, yb1 = bandes[-1]
        xg_h, xd_h = extent_x(im, (yh0+yh1)//2, coul)
        # colonne du liseré gauche : on prend le x minimal vu sur une ligne mediane du corps
        ymid = (yh1 + yb0) // 2
        xg_m, xd_m = extent_x(im, ymid, coul)
        larg = (xd_m - xg_m + 1) if xg_m is not None else None
        haut = yb1 - yh0 + 1
        rayon = (xg_h - xg_m) if (xg_h is not None and xg_m is not None) else None
        fill = mediane_fenetre(im, W//2, ymid, 3) if xg_m is not None else None
        print(f"            rect y[{yh0},{yb1}] haut={haut}px ({css(haut):.2f}CSS)"
              f"  x[{xg_m},{xd_m}] larg={larg}px ({css(larg) if larg else 0:.2f}CSS, {100*larg/W if larg else 0:.2f}% img)"
              f"  rayon~{rayon}px ({css(rayon) if rayon else 0:.1f}CSS)"
              f"  remplissage(centre)={fill}")
    # controle negatif : une ligne de ciel
    cnt = masque_lignes(im, LISERES["file"])
    print(f"            CONTROLE NEGATIF ligne de ciel y=300 : {cnt[300]} px de couleur-liseré "
          f"-> {'OK (<40)' if cnt[300] < 40 else 'BRUIT'}")
    print()
