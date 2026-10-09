#!/usr/bin/env python3
"""16 — chrome (ASSUME n°4 : juge seulement « rendu proprement et coherent ») :
filet laiton de la plaque, filet de bandeau, medaillon, dock.

CONTROLE POSITIF : le filet laiton de plaque vaut #b08d3e=(176,141,62) au centre des
deux cotes (mesure 07/14) ; le filet de bandeau doit valoir la meme famille.
CONTROLE NEGATIF : chercher un rond de dock dans la bande du CIEL doit echouer.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre

PLAQUE_HAUT = {"ref4": 684, "ref5": 774, "c24": 927, "l24": 1312, "c19": 568, "l19": 953}


def etendue_or(im, y, dmin=25, rmin=60):
    px = im.load()
    xs = [x for x in range(im.size[0]) if px[x, y][0] - px[x, y][2] >= dmin and px[x, y][0] >= rmin]
    return (min(xs), max(xs), len(xs)) if xs else (None, None, 0)


print("=== 16a — FILET LAITON du haut de plaque (.verre::after) ===")
for cle, y in PLAQUE_HAUT.items():
    im = ouvrir(cle)
    a, b, n = etendue_or(im, y)
    carte_g, carte_d = (46, 1033) if cle.startswith("ref") else (47, 1032)
    print(f"   {cle:5s} y={y}  filet x[{a},{b}] largeur={b-a+1}px ({css(b-a+1):.2f}CSS)  "
          f"retrait G={a-carte_g}px ({css(a-carte_g):.2f}CSS)  retrait D={carte_d-b}px ({css(carte_d-b):.2f}CSS)  "
          f"centre={mediane_fenetre(im, 540, y, 1)}  bord(x={a+8})={mediane_fenetre(im, a+8, y, 1)}")

print()
print("=== 16b — FILET LAITON du bandeau (.barre::after) ===")
for cle in ("ref4", "ref5", "c24", "l24", "c19", "l19"):
    im = ouvrir(cle, bavard=False)
    # cherche la ligne la plus doree entre y=100 et 180, a x=150 (hors medaillon)
    best = (-999, None, None)
    for y in range(100, 190):
        p = mediane_fenetre(im, 150, y, 1)
        if p[0]-p[2] > best[0]:
            best = (p[0]-p[2], y, p)
    a, b, n = etendue_or(im, best[1], dmin=15, rmin=40)
    print(f"   [{im.size[0]}x{im.size[1]}] {cle:5s} filet de bandeau y={best[1]} couleur={best[2]} "
          f"x[{a},{b}] largeur={b-a+1 if a is not None else 0}px  "
          f"hauteur du bandeau = {best[1]}px ({css(best[1]):.2f}CSS)")

print()
print("=== 16c — MEDAILLON (cercle du manometre) ===")
for cle in ("ref4", "c24", "c19"):
    im = ouvrir(cle)
    px = im.load()
    # le cerclage est laiton : on balaye la ligne horizontale passant par le centre
    best = (0, None)
    for y in range(20, 220):
        a, b, n = etendue_or(im, y, dmin=30, rmin=70)
        if a is not None and 300 < a < 520 and (b-a) > best[0]:
            best = (b-a, (y, a, b))
    d, (y, a, b) = best
    print(f"   {cle:5s} diametre exterieur du cerclage = {b-a+1}px ({css(b-a+1):.2f}CSS, "
          f"{100*(b-a+1)/im.size[0]:.2f}% de la largeur)  centre x={(a+b)//2} (image: {im.size[0]//2})  a y={y}")

print()
print("=== 16d — DOCK : ronds, pastille active, pastille FAMILLE ===")


def ronds(im, y, seuil=6):
    """le rond du dock est un disque legerement plus clair que le fond : on compte les
    runs de colonnes ou la luminance depasse le fond local."""
    px = im.load()
    W = im.size[0]
    L = [luminance_simple(px[x, y]) for x in range(W)]
    base = sorted(L)[len(L)//4]
    runs, cur = [], None
    for x in range(W):
        if L[x] > base + seuil:
            cur = [x, x] if cur is None else [cur[0], x]
        else:
            if cur is not None:
                if cur[1]-cur[0] > 30:
                    runs.append(tuple(cur))
                cur = None
    if cur and cur[1]-cur[0] > 30:
        runs.append(tuple(cur))
    return runs, base


DOCK_Y = {"ref4": 1933, "ref5": 1933, "c24": 2240, "l24": 2240, "c19": 1760, "l19": 1760}
for cle, y in DOCK_Y.items():
    im = ouvrir(cle)
    rs, base = ronds(im, y)
    larg = [b-a+1 for a, b in rs]
    print(f"   {cle:5s} y={y} fond={base:.1f} : {len(rs)} rond(s) {rs}  diametres={larg} "
          f"({[round(css(v),1) for v in larg]} CSS)")

print()
print("=== 16e — pastille OR sous l'onglet actif (.dock9 .actif .pt) et pastille FAMILLE (.disc) ===")
for cle in ("ref4", "c24", "c19"):
    im = ouvrir(cle)
    H = im.size[1]
    y0, y1 = (H-260, H-60)
    px = im.load()
    trouve = []
    for y in range(y0, y1):
        a, b, n = etendue_or(im, y, dmin=30, rmin=80)
        if a is not None and n >= 3:
            trouve.append((y, a, b, n))
    if trouve:
        print(f"   {cle:5s} pixels OR dans le dock y[{y0},{y1}] : "
              f"y de {trouve[0][0]} a {trouve[-1][0]}, x de {min(t[1] for t in trouve)} a {max(t[2] for t in trouve)}, "
              f"{sum(t[3] for t in trouve)} px au total")
        for t in trouve[:3] + trouve[-3:]:
            print(f"        y={t[0]} x[{t[1]},{t[2]}] n={t[3]}")
    else:
        print(f"   {cle:5s} AUCUN pixel OR dans le dock y[{y0},{y1}]")

print()
print("=== CONTROLE NEGATIF : ronds cherches dans le CIEL ===")
im = ouvrir("c24", bavard=False)
rs, base = ronds(im, 400)
print(f"   c24 y=400 : {len(rs)} 'rond(s)' {rs} -> {'OK (0)' if not rs else 'BRUIT (fond texture)'}")
