#!/usr/bin/env python3
"""03 — rectangles des deux cartes (.verre « plaque » et .suivant « ligne de file »).

Methode : le liseré de chaque carte est un trait de 3 px dont la couleur est stable.
On le detecte sur une ligne-semence INTERIEURE (donnee), puis on suit la colonne du
liseré gauche pour borner la carte en Y, et la ligne du liseré haut pour le rayon.

Sorties en px image ET en % de la largeur d'image (1080 des deux cotes) ET en px CSS (/3,6).

CONTROLE POSITIF : largeur de la plaque REF vs JEU (doit etre egale a < 2 px) ;
couleur de remplissage interieure REF vs JEU.
CONTROLE NEGATIF : la hauteur de la plaque REF vs JEU (etats differents) doit DIFFERER.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def proche(a, b, t=9):
    return all(abs(a[i] - b[i]) <= t for i in range(3))


def liseres_x(im, y, xmax_g=200, xmin_d=880):
    """liseré gauche/droit : run de >=2 px dont la luminance depasse de >=8 ses deux
    voisins a 4 px, le plus a l'exterieur possible."""
    px = im.load()
    W = im.size[0]
    L = [luminance_simple(px[x, y]) for x in range(W)]
    xg = xd = None
    for x in range(6, xmax_g):
        if L[x] - L[x - 5] >= 8 and L[x] - L[x + 6] >= 8 and L[x + 1] >= L[x] - 2:
            xg = x
            break
    for x in range(W - 7, xmin_d, -1):
        if L[x] - L[x + 5] >= 8 and L[x] - L[x - 6] >= 8 and L[x - 1] >= L[x] - 2:
            xd = x
            break
    return xg, xd


def bornes_y(im, xcol, ysemence, couleur, hmax=4000):
    """remonte/descend la colonne du liseré tant que la couleur colle."""
    px = im.load()
    H = im.size[1]
    y0 = ysemence
    while y0 > 1 and proche(px[xcol, y0 - 1], couleur, 12):
        y0 -= 1
    y1 = ysemence
    while y1 < H - 2 and proche(px[xcol, y1 + 1], couleur, 12):
        y1 += 1
    return y0, y1


def carte(im, nom, ysem, xmax_g=200, xmin_d=880):
    px = im.load()
    xg, xd = liseres_x(im, ysem, xmax_g, xmin_d)
    if xg is None or xd is None:
        print(f"   {nom:28s} NON TROUVEE (xg={xg} xd={xd}) a y={ysem}")
        return None
    coul = px[xg + 1, ysem]
    ytl, ybl = bornes_y(im, xg + 1, ysem, coul)
    # bord haut : sur la colonne centrale du liseré gauche + 60 px, cherche le trait horizontal
    xc = xg + 60
    yh = ytl
    while yh > 1 and not proche(px[xc, yh], coul, 14):
        yh -= 1
    yb = ybl
    H = im.size[1]
    while yb < H - 2 and not proche(px[xc, yb], coul, 14):
        yb += 1
    rayon = ytl - yh
    dedans = mediane_fenetre(im, (xg + xd) // 2, ysem, 3)
    larg = xd - xg + 1
    haut = yb - yh + 1
    print(f"   {nom:28s} x[{xg:4d},{xd:4d}] larg={larg:4d}px ({100*larg/im.size[0]:5.2f}% img, {css(larg):6.2f}CSS)"
          f"  y[{yh:4d},{yb:4d}] haut={haut:4d}px ({css(haut):6.2f}CSS)"
          f"  liseré={coul} rayon~{rayon}px({css(rayon):.1f}CSS)"
          f"  gouttG={xg}px({100*xg/im.size[0]:.2f}%) gouttD={im.size[0]-1-xd}px({100*(im.size[0]-1-xd)/im.size[0]:.2f}%)"
          f"  remplissage={dedans}")
    return dict(xg=xg, xd=xd, yh=yh, yb=yb, larg=larg, haut=haut, coul=coul, fill=dedans)


CAS = [
    ("ref4", [("REF4 plaque LA SUITE", 1000), ("REF4 ligne de file", 1660)]),
    ("ref5", [("REF5 plaque carte TETE", 1000), ("REF5 ligne de file", 1660)]),
    ("c24",  [("C24 plaque LA SUITE", 1150), ("C24 ligne de file", 2050)]),
    ("c19",  [("C19 plaque LA SUITE", 1000), ("C19 ligne de file", 1640)]),
    ("l24",  [("L24 plaque carte TETE", 1400), ("L24 ligne de file", 2050)]),
    ("l19",  [("L19 plaque carte TETE", 1150), ("L19 ligne de file", 1640)]),
]

res = {}
print("=== 03 — rectangles des cartes ===")
for cle, sondes in CAS:
    im = ouvrir(cle)
    for nom, y in sondes:
        res[nom] = carte(im, nom, y)
    print()

print("=== CONTROLES ===")
a, b = res["REF4 plaque LA SUITE"], res["C24 plaque LA SUITE"]
print(f"POSITIF  largeur plaque  REF4={a['larg']}px  C24={b['larg']}px  delta={b['larg']-a['larg']}px "
      f"({css(abs(b['larg']-a['larg'])):.2f} CSS)  -> {'EGAL' if abs(b['larg']-a['larg'])<=2 else 'ECART'}")
print(f"POSITIF  remplissage     REF4={a['fill']}  C24={b['fill']}  "
      f"delta={tuple(b['fill'][i]-a['fill'][i] for i in range(3))}")
print(f"POSITIF  liseré          REF4={a['coul']}  C24={b['coul']}  "
      f"delta={tuple(b['coul'][i]-a['coul'][i] for i in range(3))}")
print(f"NEGATIF  hauteur plaque  REF4={a['haut']}px  C24={b['haut']}px  delta={b['haut']-a['haut']}px "
      f"-> {'DIFFERE (instrument discrimine)' if abs(b['haut']-a['haut'])>4 else 'IDENTIQUE (suspect)'}")
