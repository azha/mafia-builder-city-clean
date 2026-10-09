#!/usr/bin/env python3
"""15 — CORRESPONDANCE DES REPERES : tous les rects, verifies un par un.

Correction d'un faux du 05 : a 1080x1920 le degrade du decor passe juste au-dessus de
la carte de file et le detecteur de « maximum local » y voyait un bord a y=1327 alors
que le liseré est a y=1344..1347 (profil colle au rapport). Ici le bord haut est
cherche par la COULEUR du liseré (42,53,71)/(42,54,72), pas par la luminance.

CONTROLE POSITIF : REF4 et REF5 doivent rendre EXACTEMENT le meme rect de carte de file
(meme HTML). C24 et L24 aussi (meme ecran, deux etats de texte).
CONTROLE NEGATIF : la recherche du liseré dans une bande de CIEL doit echouer.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def bord_maxlocal(im, y0, y1, xdeb, xfin, mini=400, d=6):
    """lignes y ou >= mini colonnes presentent un MAXIMUM LOCAL de luminance :
    c'est un trait horizontal, qu'il soit eclairci (liseré nu) ou assombri par
    l'ombre portee de la plaque (cas de la REFERENCE, ou le liseré haut du
    .suivant lit (25,33,44) au lieu de (42,54,72))."""
    px = im.load()
    L = lambda x, y: luminance_simple(px[x, y])
    res = []
    for y in range(y0, y1):
        n = 0
        for x in range(xdeb, xfin, 2):
            if L(x, y) - L(x, y-d) >= 5 and L(x, y) - L(x, y+d) >= 5:
                n += 1
        if n >= mini // 2:
            res.append((y, n))
    return res


def bord_couleur(im, coul, y0, y1, xdeb, xfin, tol=6, mini=400):
    """lignes y dont >= mini pixels sont proches de `coul` (le liseré plein)."""
    px = im.load()
    res = []
    for y in range(y0, y1):
        n = 0
        for x in range(xdeb, xfin):
            p = px[x, y]
            if abs(p[0]-coul[0]) <= tol and abs(p[1]-coul[1]) <= tol and abs(p[2]-coul[2]) <= tol:
                n += 1
        if n >= mini:
            res.append((y, n))
    return res


def filet_or(im, y0, y1, xc=540):
    """ligne la plus doree (R-B max) : le .verre::after #b08d3e."""
    best, by, bp = -999, None, None
    for y in range(y0, y1):
        p = mediane_fenetre(im, xc, y, 2)
        if p[0]-p[2] > best:
            best, by, bp = p[0]-p[2], y, p
    return by, bp, best


CFG = [
    # cle,  liseré file,     fenetre bord-haut-file, fenetre filet-or-plaque, bas de plaque
    ("ref4", (42, 54, 72), (1500, 1600), (670, 700), (1493, 1496)),
    ("ref5", (42, 54, 72), (1500, 1600), (760, 790), (1493, 1496)),
    ("c24",  (42, 53, 71), (1690, 1780), (915, 945), (1665, 1668)),
    ("l24",  (42, 53, 71), (1690, 1780), (1300, 1330), (1665, 1668)),
    ("c19",  (42, 53, 71), (1330, 1420), (780, 830), (1306, 1309)),
    ("l19",  (42, 53, 71), (1330, 1420), (940, 975), (1306, 1309)),
]

print("=== 15 — reperes ===")
REP = {}
for cle, coul, (fy0, fy1), (oy0, oy1), (py0, py1) in CFG:
    im = ouvrir(cle)
    W, H = im.size
    haut = bord_maxlocal(im, fy0, fy1, 100, 980)
    bas = bord_couleur(im, coul, H-120 if H > 2000 else H-400, H-1, 100, 980)
    yfh = haut[0][0] if haut else None
    # bord bas de la carte de file : derniere ligne liseré de l'image
    tous = bord_couleur(im, coul, fy1, H-1, 100, 980)
    yfb = tous[-1][0] if tous else None
    yo, po, do = filet_or(im, oy0, oy1)
    REP[cle] = dict(W=W, H=H, file_h=yfh, file_b=yfb, plaque_h=yo, plaque_b=py0)
    fh = (yfb - yfh + 1) if (yfh and yfb) else None
    ph = (py0 - yo + 1)
    print(f"   {cle:5s} {W}x{H}")
    print(f"        plaque .verre  : haut y={yo} (filet laiton {po}, R-B={do})  bas y={py0}  "
          f"hauteur={ph}px ({css(ph):.2f}CSS, {100*ph/H:.2f}% de l'image)")
    print(f"        carte de file  : haut y={yfh}  bas y={yfb}  hauteur={fh}px ({css(fh):.2f}CSS, {100*fh/H:.2f}% de l'image)")
    ecart = yfh - py1 if yfh else None
    print(f"        ECART plaque<->file = {ecart}px ({css(ecart):.2f}CSS) = {ecart/H:.4f} de la hauteur d'image"
          f" ; = {ecart/(H-480):.4f} de (H-480)")
    print(f"        bas de la carte de file a {H-1-yfb}px du bas de l'image ({css(H-1-yfb):.2f}CSS)")
    print()

print("=== CONTROLES ===")
print(f"POSITIF REF4 vs REF5 carte de file : {REP['ref4']['file_h']},{REP['ref4']['file_b']} vs "
      f"{REP['ref5']['file_h']},{REP['ref5']['file_b']} -> "
      f"{'IDENTIQUE' if REP['ref4']['file_h'] == REP['ref5']['file_h'] and REP['ref4']['file_b'] == REP['ref5']['file_b'] else 'DIFFERE'}")
print(f"POSITIF C24 vs L24 carte de file   : {REP['c24']['file_h']},{REP['c24']['file_b']} vs "
      f"{REP['l24']['file_h']},{REP['l24']['file_b']} -> "
      f"{'IDENTIQUE' if REP['c24']['file_h'] == REP['l24']['file_h'] else 'DIFFERE'}")
im = ouvrir("c24", bavard=False)
print(f"NEGATIF liseré cherche dans le ciel y[300,500] : "
      f"{len(bord_couleur(im, (42,53,71), 300, 500, 100, 980))} ligne(s) -> "
      f"{'OK (0)' if not bord_couleur(im, (42,53,71), 300, 500, 100, 980) else 'BRUIT'}")
print()
print("=== hauteurs de carte de file, cote a cote ===")
for cle in ("ref4", "c19", "l19", "c24", "l24"):
    r = REP[cle]
    h = r['file_b'] - r['file_h'] + 1
    print(f"   {cle:5s} H={r['H']}  carte de file = {h:4d}px = {css(h):6.2f} CSS"
          f"   (reference = {REP['ref4']['file_b']-REP['ref4']['file_h']+1}px = "
          f"{css(REP['ref4']['file_b']-REP['ref4']['file_h']+1):.2f} CSS, ecart "
          f"{100*(h-(REP['ref4']['file_b']-REP['ref4']['file_h']+1))/(REP['ref4']['file_b']-REP['ref4']['file_h']+1):+.1f} %)")
