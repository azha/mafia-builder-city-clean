#!/usr/bin/env python3
"""17 — dock et medaillon, mesures CIBLEES.

Le 16 a rendu trois faux que je corrige ici et que je signale au rapport :
  - le filet laiton du c24 a y=927 : la fenetre x allait de 0 a 1080 et attrapait les
    toits eclaires du decor HORS carte -> ici x borne a l'interieur de la carte ;
  - le « medaillon » : le masque or attrapait aussi « 24 850 € » -> ici on balaye une
    LIGNE passant par le centre du medaillon et on prend les DEUX anneaux ;
  - les « ronds » du dock : le seuil +6 ne mesurait que le coeur du degrade radial
    (65 % du rayon dans la CSS atelier) -> ici on cherche le LISERÉ du rond.

CONTROLE POSITIF : les 4 ronds du dock doivent etre equidistants des deux cotes.
CONTROLE NEGATIF : la pastille FAMILLE cherchee la ou elle n'est PAS (sous EMPIRE)
doit rendre 0 px.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre

PLAQUE = {"ref4": (684, 46, 1033), "ref5": (774, 46, 1033), "c24": (927, 47, 1032),
          "l24": (1312, 47, 1032), "c19": (568, 47, 1032), "l19": (953, 47, 1032)}

print("=== 17a — FILET LAITON du haut de plaque, borne A L'INTERIEUR de la carte ===")
for cle, (y, xg, xd) in PLAQUE.items():
    im = ouvrir(cle)
    px = im.load()
    xs = [x for x in range(xg+4, xd-3) if px[x, y][0]-px[x, y][2] >= 25 and px[x, y][0] >= 60]
    a, b = (min(xs), max(xs)) if xs else (None, None)
    print(f"   {cle:5s} y={y} filet x[{a},{b}] largeur={b-a+1}px ({css(b-a+1):6.2f}CSS) "
          f"= {100*(b-a+1)/(xd-xg+1):5.1f} % de la largeur de carte ; "
          f"retrait G={a-xg}px({css(a-xg):.1f}CSS) D={xd-b}px({css(xd-b):.1f}CSS) ; centre={mediane_fenetre(im,540,y,1)}")

print()
print("=== 17b — MEDAILLON : anneau laiton sur la ligne de centre ===")


def anneau(im, y, dmin=25, rmin=60, xmin=330, xmax=760):
    px = im.load()
    xs = [x for x in range(xmin, xmax) if px[x, y][0]-px[x, y][2] >= dmin and px[x, y][0] >= rmin]
    if not xs:
        return None
    return min(xs), max(xs), len(xs)


for cle, ys in (("ref4", range(80, 160)), ("ref5", range(80, 160)),
                ("c24", range(60, 140)), ("c19", range(60, 140))):
    im = ouvrir(cle)
    best = (0, None)
    for y in ys:
        r = anneau(im, y)
        if r and (r[1]-r[0]) > best[0]:
            best = (r[1]-r[0], (y, r))
    y, (a, b, n) = best[1]
    print(f"   {cle:5s} ligne de centre y={y} : anneau x[{a},{b}]  diametre={b-a+1}px "
          f"({css(b-a+1):.2f}CSS, {100*(b-a+1)/im.size[0]:.2f}% de la largeur)  centre x={(a+b)//2} (milieu=540)")

print()
print("=== 17c — DOCK : liseré des ronds, ecartement, pastille active, pastille FAMILLE ===")
DOCK = {"ref4": (1870, 1990), "ref5": (1870, 1990), "c24": (2180, 2300),
        "l24": (2180, 2300), "c19": (1700, 1820), "l19": (1700, 1820)}
for cle, (yh, yb) in DOCK.items():
    im = ouvrir(cle)
    px = im.load()
    ymid = (yh + yb)//2
    L = [luminance_simple(px[x, ymid]) for x in range(im.size[0])]
    base = sorted(L)[len(L)//4]
    runs, cur = [], None
    for x in range(im.size[0]):
        if L[x] > base + 2.5:
            cur = [x, x] if cur is None else [cur[0], x]
        else:
            if cur is not None:
                if cur[1]-cur[0] > 40:
                    runs.append(tuple(cur))
                cur = None
    if cur and cur[1]-cur[0] > 40:
        runs.append(tuple(cur))
    cen = [(a+b)/2 for a, b in runs]
    dia = [b-a+1 for a, b in runs]
    ecarts = [round(cen[i+1]-cen[i], 1) for i in range(len(cen)-1)]
    print(f"   {cle:5s} y={ymid} : {len(runs)} rond(s)  diametres={dia} ({[round(css(d),1) for d in dia]} CSS)  "
          f"centres={[round(c,1) for c in cen]}  ecartements={ecarts}")

print()
print("=== 17d — pastille OR sous l'onglet actif (.pt) et pastille FAMILLE (.disc) ===")


def or_box(im, x0, x1, y0, y1, dmin=30, rmin=80):
    px = im.load()
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1)
           if px[x, y][0]-px[x, y][2] >= dmin and px[x, y][0] >= rmin]
    if not pts:
        return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return dict(x0=min(xs), x1=max(xs), y0=min(ys), y1=max(ys), n=len(pts),
                w=max(xs)-min(xs)+1, h=max(ys)-min(ys)+1)


# fenetres : sous le rond EMPIRE (.pt) et coin haut-droit du rond FAMILLE (.disc)
CAS = [
    ("ref4", "pastille active sous EMPIRE (.pt)", 200, 320, 1975, 2010),
    ("c24",  "pastille active sous EMPIRE (.pt)", 200, 320, 2295, 2330),
    ("c19",  "pastille active sous EMPIRE (.pt)", 200, 320, 1815, 1850),
    ("ref4", "pastille FAMILLE (.disc)         ", 460, 540, 1860, 1930),
    ("c24",  "pastille FAMILLE (.disc)         ", 460, 540, 2175, 2250),
    ("c19",  "pastille FAMILLE (.disc)         ", 460, 540, 1695, 1770),
]
for cle, lib, x0, x1, y0, y1 in CAS:
    im = ouvrir(cle, bavard=False)
    b = or_box(im, x0, x1, y0, y1)
    if not b:
        print(f"   [{im.size[0]}x{im.size[1]}] {cle:5s} {lib} : *** ABSENTE *** (0 px or dans x[{x0},{x1}] y[{y0},{y1}])")
    else:
        print(f"   [{im.size[0]}x{im.size[1]}] {cle:5s} {lib} : x[{b['x0']},{b['x1']}] y[{b['y0']},{b['y1']}] "
              f"{b['w']}x{b['h']}px ({css(b['w']):.1f}x{css(b['h']):.1f} CSS) {b['n']}px or")

print()
print("=== CONTROLE NEGATIF : .disc cherchee SOUS le rond EMPIRE (ou elle n'est pas) ===")
for cle, y0, y1 in (("ref4", 1860, 1930), ("c24", 2175, 2250)):
    im = ouvrir(cle, bavard=False)
    b = or_box(im, 270, 350, y0, y1)
    print(f"   {cle} : {0 if not b else b['n']} px -> {'OK' if not b else 'BRUIT'}")
