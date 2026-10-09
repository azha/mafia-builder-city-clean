#!/usr/bin/env python3
"""05 — rythme vertical INTERNE des cartes (bandes d'encre) + rect exact de chaque carte.

Un rapport INTERNE (bloc / son voisin, marge haute / marge basse) est invariant d'echelle
(dossier.md L51-52) : c'est la seule comparaison legitime en Y entre 2102, 2400 et 1920.

Methode :
  1. rect de la carte : masque de la couleur de liseré, restreint a une fenetre y.
  2. bandes d'encre : pour chaque ligne du corps, compte des px dont la luminance depasse
     (remplissage + 10). Les runs de lignes a encre > 2 sont les lignes de texte.

CONTROLE POSITIF : la REF4 et la REF5 partagent la MEME ligne de file (meme HTML) :
leurs rects et leurs bandes doivent coincider a < 2 px.
CONTROLE NEGATIF : la bande du fond (hors carte) doit rendre 0 bande.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def rect(im, coul, y0, y1, tol=9, seuil=400):
    """bords de la carte par MAXIMUM LOCAL de luminance (robuste a l'ombre portee de
    la plaque, qui assombrit le liseré haut du .suivant dans la REFERENCE).
    - liseré gauche/droit : sur une ligne mediane, L(x) > L(x-6) et L(x+6) de >= 6.
    - liseré haut/bas : sur une colonne a xg+80, L(y) > L(y-7) et L(y+7) de >= 6.
    """
    px = im.load()
    W = im.size[0]
    ymid = (y0 + y1) // 2
    L = lambda x, y: luminance_simple(px[x, y])
    xg = xd = None
    for x in range(8, 220):
        if L(x, ymid) - L(x-6, ymid) >= 6 and L(x, ymid) - L(x+6, ymid) >= 6:
            xg = x
            break
    for x in range(W-9, W-220, -1):
        if L(x, ymid) - L(x+6, ymid) >= 6 and L(x, ymid) - L(x-6, ymid) >= 6:
            xd = x
            break
    if xg is None or xd is None:
        return None
    xc = xg + 80
    yh = yb = None
    for y in range(y0, y1):
        if L(xc, y) - L(xc, y-7) >= 6 and L(xc, y) - L(xc, y+7) >= 6:
            yh = y
            break
    for y in range(y1, y0, -1):
        if L(xc, y) - L(xc, y+7) >= 6 and L(xc, y) - L(xc, y-7) >= 6:
            yb = y
            break
    if yh is None or yb is None:
        return None
    return dict(yh=yh, yb=yb, xg=xg, xd=xd, h=yb-yh+1, w=xd-xg+1)


def bandes(im, xg, xd, yh, yb, pad=10, marge=10, mini=3):
    px = im.load()
    # fond : MEDIANE de la luminance de tout l'interieur (l'aplat domine l'encre)
    ech = []
    for y in range(yh+4, yb-3, 2):
        for x in range(xg+pad, xd-pad, 4):
            ech.append(luminance_simple(px[x, y]))
    ech.sort()
    fondL = ech[len(ech)//2]
    seuil = fondL + marge
    out, cur = [], None
    for y in range(yh+2, yb-1):
        n = 0
        for x in range(xg+pad, xd-pad):
            if luminance_simple(px[x, y]) > seuil:
                n += 1
        if n >= mini:
            if cur is None:
                cur = [y, y, n]
            else:
                cur[1] = y
                cur[2] = max(cur[2], n)
        else:
            if cur is not None:
                out.append(tuple(cur))
                cur = None
    if cur:
        out.append(tuple(cur))
    return out, fondL, seuil


# fenetre y OUVERTE SOUS le bord bas de la plaque (mesure 04 : plaque bas = 1493/1665/1306)
CAS = [
    ("ref4", "REF4", (42, 54, 72), 1505, 1900),
    ("ref5", "REF5", (42, 54, 72), 1505, 1900),
    ("c24",  "C24 ", (42, 53, 71), 1690, 2200),
    ("c19",  "C19 ", (42, 53, 71), 1325, 1750),
    ("l24",  "L24 ", (42, 53, 71), 1690, 2200),
    ("l19",  "L19 ", (42, 53, 71), 1325, 1750),
]

print("=== 05 — LIGNE DE FILE (.suivant) : rect + bandes d'encre ===")
R = {}
for cle, nom, coul, y0, y1 in CAS:
    im = ouvrir(cle)
    r = rect(im, coul, y0, y1)
    if not r:
        print(f"   {nom} : carte NON TROUVEE dans [{y0},{y1}]")
        continue
    bs, fondL, seuil = bandes(im, r["xg"], r["xd"], r["yh"], r["yb"])
    R[nom.strip()] = (r, bs)
    print(f"   {nom} rect x[{r['xg']},{r['xd']}] w={r['w']}px({css(r['w']):.2f}CSS)  "
          f"y[{r['yh']},{r['yb']}] h={r['h']}px({css(r['h']):.2f}CSS)  fondL={fondL:.1f} seuil={seuil:.1f}")
    prev = r["yh"]
    for (a, b, n) in bs:
        print(f"        bande y[{a:4d},{b:4d}] h={b-a+1:3d}px ({css(b-a+1):5.2f}CSS)  "
              f"ecart au precedent={a-prev:3d}px ({css(a-prev):5.2f}CSS)  encre max={n}")
        prev = b + 1
    marge_haute = bs[0][0] - r["yh"] if bs else None
    marge_basse = r["yb"] - bs[-1][1] if bs else None
    print(f"        MARGE HAUTE={marge_haute}px ({css(marge_haute):.2f}CSS)   "
          f"MARGE BASSE={marge_basse}px ({css(marge_basse):.2f}CSS)   "
          f"rapport basse/haute={marge_basse/marge_haute:.2f}")
    bloc = bs[-1][1]-bs[0][0]+1 if bs else 0
    print(f"        bloc d'encre={bloc}px ({css(bloc):.2f}CSS) = {100*bloc/r['h']:.1f} % de la carte ;"
          f" vide = {100*(r['h']-bloc)/r['h']:.1f} %")
    print()

print("=== CONTROLE POSITIF : REF4 et REF5 portent la MEME ligne de file (meme HTML, cadres 4 et 5) ===")
if "REF4" in R and "REF5" in R:
    a, b = R["REF4"][0], R["REF5"][0]
    print(f"   rect REF4 y[{a['yh']},{a['yb']}] h={a['h']}  |  REF5 y[{b['yh']},{b['yb']}] h={b['h']}  "
          f"-> delta h={b['h']-a['h']}px {'EGAL (instrument fiable)' if abs(b['h']-a['h'])<=2 else 'ECART (instrument suspect)'}")
print("=== CONTROLE NEGATIF : bandes cherchees dans une fenetre de CIEL (aucune carte) ===")
im = ouvrir("c24", bavard=False)
bs, fondL, seuil = bandes(im, 100, 980, 300, 500)
print(f"   c24 ciel y[300,500] : {len(bs)} bande(s) -> {'OK (0)' if len(bs)==0 else 'BRUIT : ' + str(bs[:3])}")
