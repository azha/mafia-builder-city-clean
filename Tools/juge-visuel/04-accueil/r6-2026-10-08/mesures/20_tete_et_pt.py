#!/usr/bin/env python3
"""20 — carte de TETE : gestes isoles, part d'or ; et la pastille active du dock.

CONTROLE POSITIF : les DEUX gestes de la reference (or a gauche, liseré a droite) doivent
etre trouves par deux instruments DIFFERENTS (masque or / maximum local de luminance) et
avoir la MEME hauteur — c'est la meme rangee flex.
CONTROLE NEGATIF : le masque or applique au geste a liseré doit rendre ~0 px.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def boite_or(im, x0, y0, x1, y1, rmin=110, dmin=45):
    px = im.load()
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1)
           if px[x, y][0] >= rmin and px[x, y][0]-px[x, y][2] >= dmin]
    if not pts:
        return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return dict(x0=min(xs), x1=max(xs), y0=min(ys), y1=max(ys), n=len(pts),
                w=max(xs)-min(xs)+1, h=max(ys)-min(ys)+1)


def boite_liseré(im, x0, y0, x1, y1, seuil=7):
    """le geste a liseré : liseré #ffffff2a sur fond #ffffff0a — maximum local."""
    px = im.load()
    L = lambda x, y: luminance_simple(px[x, y])
    ym = (y0+y1)//2
    xg = xd = None
    for x in range(x0+6, x1-6):
        if L(x, ym)-L(x-6, ym) >= seuil and L(x, ym)-L(x+6, ym) >= seuil:
            xg = x; break
    for x in range(x1-7, x0+6, -1):
        if L(x, ym)-L(x+6, ym) >= seuil and L(x, ym)-L(x-6, ym) >= seuil:
            xd = x; break
    if xg is None or xd is None:
        return None
    xc = (xg+xd)//2
    yh = yb = None
    for y in range(y0, y1):
        if L(xg+30, y)-L(xg+30, y-7) >= seuil and L(xg+30, y)-L(xg+30, y+7) >= seuil:
            yh = y; break
    for y in range(y1, y0, -1):
        if L(xg+30, y)-L(xg+30, y+7) >= seuil and L(xg+30, y)-L(xg+30, y-7) >= seuil:
            yb = y; break
    return dict(x0=xg, x1=xd, y0=yh, y1=yb, w=xd-xg+1, h=(yb-yh+1) if (yh and yb) else None)


print("=== 20a — gestes de la carte de TETE ===")
# plaque REF5 x[46,1033] y[771,1495] (h=725) ; L24 x[47,1032] y[1312,1667] (h=356)
im = ouvrir("ref5")
g_or = boite_or(im, 60, 1130, 545, 1290)
g_li = boite_liseré(im, 540, 1135, 1020, 1285)
print(f"   REF5 geste OR      x[{g_or['x0']},{g_or['x1']}] {g_or['w']}x{g_or['h']}px "
      f"({css(g_or['w']):.1f}x{css(g_or['h']):.1f} CSS)  = {100*g_or['w']/988:.1f} % de la largeur de plaque ; aire or={g_or['n']}px")
print(f"   REF5 geste LISERÉ  x[{g_li['x0']},{g_li['x1']}] {g_li['w']}x{g_li['h']}px "
      f"({css(g_li['w']):.1f}x{css(g_li['h']):.1f} CSS)  = {100*g_li['w']/988:.1f} % de la largeur de plaque")
print(f"   REF5 ECART entre les deux gestes = {g_li['x0']-g_or['x1']-1}px ({css(g_li['x0']-g_or['x1']-1):.2f} CSS)")
print(f"   CONTROLE NEGATIF : masque or sur le geste a liseré -> "
      f"{(boite_or(im, 560, 1140, 1000, 1280) or {'n':0})['n']} px")

im = ouvrir("l24")
j_or = boite_or(im, 60, 1500, 1020, 1660)
print(f"   L24  geste OR      x[{j_or['x0']},{j_or['x1']}] {j_or['w']}x{j_or['h']}px "
      f"({css(j_or['w']):.1f}x{css(j_or['h']):.1f} CSS)  = {100*j_or['w']/986:.1f} % de la largeur de plaque ; aire or={j_or['n']}px")
print(f"   CONTROLE NEGATIF : second geste cherche a DROITE du geste or (L24) -> "
      f"{(boite_liseré(im, j_or['x1']+6, 1500, 1030, 1660) or {'w':'aucun'})['w']}")

print()
print("   PART D'OR dans la carte de tete :")
print(f"      REF5 : {g_or['n']} px or / {988*725} px de plaque = {100*g_or['n']/(988*725):.2f} %")
print(f"      L24  : {j_or['n']} px or / {986*356} px de plaque = {100*j_or['n']/(986*356):.2f} %")
print(f"      rapport jeu/reference = {(j_or['n']/(986*356))/(g_or['n']/(988*725)):.2f} x")

print()
print("=== 20b — PASTILLE ACTIVE du dock (.pt, 14x2 px CSS = 50x7 px image) ===")
for cle, y0, y1 in (("ref4", 2005, 2032), ("ref5", 2005, 2032), ("c24", 2300, 2325),
                    ("l24", 2300, 2325), ("c19", 1820, 1845), ("l19", 1820, 1845)):
    im = ouvrir(cle, bavard=False)
    b = boite_or(im, 215, y0, 305, y1, rmin=90, dmin=40)
    if not b:
        print(f"   [{im.size[0]}x{im.size[1]}] {cle:5s} .pt ABSENTE dans y[{y0},{y1}]")
        continue
    print(f"   [{im.size[0]}x{im.size[1]}] {cle:5s} .pt x[{b['x0']},{b['x1']}] y[{b['y0']},{b['y1']}] "
          f"{b['w']}x{b['h']}px ({css(b['w']):.2f}x{css(b['h']):.2f} CSS) "
          f"couleur={mediane_fenetre(im, (b['x0']+b['x1'])//2, (b['y0']+b['y1'])//2, 1)}")
