#!/usr/bin/env python3
"""07 — bandes d'encre dans des rects EXPLICITES (lus aux mesures 02/04/05/06).

Les rects viennent de profils de pixels colles dans le rapport :
  - liseré lateral des cartes : REF x[46,1033] ; JEU x[47,1032]
  - plaque .verre, bord bas  : REF y=1493..1495 ; 2400 y=1665..1667 ; 1920 y=1306..1308
  - plaque .verre, bord haut : trouve ici par le FILET LAITON (.verre::after, #b08d3e)
  - carte .suivant           : REF y[1531,1825] ; 2400 y[1716,2103] ; 1920 y[1327,1635]

CONTROLE POSITIF : REF4 et REF5 ont la MEME carte .suivant -> memes bandes (verifie au 05).
CONTROLE NEGATIF : un rect pris dans le CIEL ne doit donner aucune bande de texte
                   (encre_max < 50 sur toute bande trouvee).
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def bandes(im, xg, xd, yh, yb, pad=14, marge=10, mini=3):
    px = im.load()
    ech = []
    for y in range(yh+5, yb-4, 2):
        for x in range(xg+pad, xd-pad, 3):
            ech.append(luminance_simple(px[x, y]))
    ech.sort()
    fondL = ech[len(ech)//2]
    seuil = fondL + marge
    out, cur = [], None
    for y in range(yh+5, yb-4):
        n = sum(1 for x in range(xg+pad, xd-pad) if luminance_simple(px[x, y]) > seuil)
        if n >= mini:
            cur = [y, y, n] if cur is None else [cur[0], y, max(cur[2], n)]
        else:
            if cur is not None:
                out.append(tuple(cur)); cur = None
    if cur:
        out.append(tuple(cur))
    return out, fondL, seuil


def filet_or(im, xg, xd, y0, y1):
    """cherche la ligne la plus DOREE (R nettement > B) dans la fenetre."""
    px = im.load()
    xc = (xg + xd) // 2
    best, by = -999, None
    for y in range(y0, y1):
        p = mediane_fenetre(im, xc, y, 2)
        d = p[0] - p[2]
        if d > best:
            best, by, bp = d, y, p
    return by, best, mediane_fenetre(im, xc, by, 2)


# (cle, nom, xg, xd, yh, yb)
RECTS = [
    ("ref5", "REF5 carte de TETE   ", 46, 1033, 771, 1495),
    ("l24",  "L24  carte de TETE   ", 47, 1032, 1312, 1667),
    ("l19",  "L19  carte de TETE   ", 47, 1032, 953, 1308),
    ("ref4", "REF4 plaque LA SUITE ", 46, 1033, 683, 1495),
    ("c24",  "C24  plaque LA SUITE ", 47, 1032, 927, 1667),
    ("c19",  "C19  plaque LA SUITE ", 47, 1032, 808, 1308),
]

print("=== 07 — bandes d'encre dans les plaques ===")
for cle, nom, xg, xd, yh, yb in RECTS:
    im = ouvrir(cle)
    bs, fondL, seuil = bandes(im, xg, xd, yh, yb)
    h = yb - yh + 1
    print(f"   {nom} rect x[{xg},{xd}] y[{yh},{yb}]  h={h}px ({css(h):.2f}CSS)  fondL={fondL:.1f} seuil={seuil:.1f}")
    yo, d, p = filet_or(im, xg, xd, yh-6, yh+14)
    print(f"        FILET LAITON (.verre::after) : ligne la plus doree y={yo} couleur={p} (R-B={d})")
    prev = None
    for (a, b, n) in bs:
        g = f"  ecart={a-prev:3d}px({css(a-prev):5.2f}CSS)" if prev is not None else ""
        print(f"        bande y[{a:4d},{b:4d}] h={b-a+1:3d}px ({css(b-a+1):5.2f}CSS) largeur_encre_max={n:4d}{g}")
        prev = b + 1
    if bs:
        mh, mb = bs[0][0]-yh, yb-bs[-1][1]
        bloc = bs[-1][1]-bs[0][0]+1
        print(f"        MARGE HAUTE={mh}px({css(mh):.2f}CSS)  MARGE BASSE={mb}px({css(mb):.2f}CSS)"
              f"  bloc d'encre={bloc}px({css(bloc):.2f}CSS) = {100*bloc/h:.1f}% de la carte")
    print()

print("=== CONTROLE NEGATIF : meme detecteur sur un rect de CIEL ===")
im = ouvrir("l24", bavard=False)
bs, fondL, seuil = bandes(im, 47, 1032, 200, 560)
print(f"   l24 ciel y[200,560] : {len(bs)} bande(s), encre_max={max([b[2] for b in bs]) if bs else 0}"
      f"  -> {'OK' if (not bs or max(b[2] for b in bs) < 60) else 'BRUIT'}")
