#!/usr/bin/env python3
"""12 — gestes (boutons) : rect du bouton OR, rect des boutons a liseré, et
etiquette de gravite de la ligne de file.

Bouton OR : masque R>=110 et R-B>=45 (le degrade #e9c56b -> #c99a37 tient largement).
Bouton a liseré : maximum local de luminance sur une ligne traversant le bouton.

CONTROLE POSITIF : le bouton OR de la rangee 1 de « la suite » existe des deux cotes
(COMMANDER / CUIRE) — le masque doit le trouver dans les deux, avec une hauteur proche.
CONTROLE NEGATIF : le meme masque applique a une fenetre de PLAQUE SANS bouton or
(la rangee 3, BLANCHIR, a liseré) doit rendre une aire quasi nulle.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def masque_or(im, x0, y0, x1, y1, rmin=110, dmin=45):
    px = im.load()
    xs, ys, n = [], [], 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]
            if p[0] >= rmin and (p[0]-p[2]) >= dmin:
                xs.append(x); ys.append(y); n += 1
    if not xs:
        return None
    return dict(x0=min(xs), x1=max(xs), y0=min(ys), y1=max(ys),
                w=max(xs)-min(xs)+1, h=max(ys)-min(ys)+1, aire=n)


print("=== 12a — BOUTON OR ===")
CAS_OR = [
    ("ref4", "REF4 suite r1 COMMANDER", 600, 780, 1040, 920),
    ("c24",  "C24  suite r1 CUIRE    ", 600, 1010, 1040, 1150),
    ("ref5", "REF5 tete bouton or    ", 60, 1130, 1030, 1290),
    ("l24",  "L24  tete bouton or    ", 60, 1500, 1030, 1660),
    ("l19",  "L19  tete bouton or    ", 60, 1140, 1030, 1300),
]
R = {}
for cle, nom, x0, y0, x1, y1 in CAS_OR:
    im = ouvrir(cle)
    m = masque_or(im, x0, y0, x1, y1)
    if not m:
        print(f"   {nom} AUCUN PIXEL OR dans la fenetre"); continue
    R[nom.split()[0]+nom.split()[1]] = m
    W = im.size[0]
    print(f"   {nom} x[{m['x0']},{m['x1']}] larg={m['w']:4d}px ({css(m['w']):6.2f}CSS, {100*m['w']/W:5.2f}% img)"
          f"  y[{m['y0']},{m['y1']}] haut={m['h']:3d}px ({css(m['h']):5.2f}CSS)"
          f"  aire={m['aire']:6d}px  centre={mediane_fenetre(im, (m['x0']+m['x1'])//2, (m['y0']+m['y1'])//2, 4)}")

print()
print("   CONTROLE NEGATIF : masque OR sur la rangee BLANCHIR (bouton a liseré, aucun or)")
for cle, nom, x0, y0, x1, y1 in (("ref4", "REF4 r3", 600, 1230, 1040, 1380),
                                 ("c24",  "C24  r2", 600, 1200, 1040, 1350)):
    im = ouvrir(cle, bavard=False)
    m = masque_or(im, x0, y0, x1, y1)
    print(f"      {nom} aire or = {m['aire'] if m else 0} px -> "
          f"{'OK (discrimine)' if (not m or m['aire'] < 200) else 'BRUIT'}")

print()
print("=== 12b — carte de TETE : part du geste OR dans la plaque ===")
# plaques : REF5 x[46,1033] y[771,1495] ; L24 x[47,1032] y[1312,1667] ; L19 y[953,1308]
PL = {"REF5tete": (988, 725), "L24tete": (986, 356), "L19tete": (986, 356)}
for k, (pw, ph) in PL.items():
    m = R.get(k)
    if not m:
        continue
    print(f"   {k:9s} bouton or : largeur = {100*m['w']/pw:5.1f} % de la largeur de plaque ;"
          f"  hauteur = {100*m['h']/ph:5.1f} % de la hauteur de plaque ;"
          f"  aire or = {100*m['aire']/(pw*ph):5.2f} % de la plaque")

print()
print("=== 12c — etiquette de gravite de la ligne de file (.qui small) ===")


def encre(im, x0, x1, y0, y1, fondL, marge=12):
    px = im.load(); s = fondL + marge
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if luminance_simple(px[x, y]) > s:
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return dict(x0=min(xs), x1=max(xs), y0=min(ys), y1=max(ys),
                w=max(xs)-min(xs)+1, h=max(ys)-min(ys)+1, n=len(xs))


def capitale_finale(im, x0, x1, y0, y1, fondL, larg=16, marge=12):
    """le E final de LEGERE / MODEREE : pas d'accent, pas de jambage."""
    e = encre(im, x0, x1, y0, y1, fondL)
    if not e:
        return None
    return encre(im, e['x1']-larg, e['x1']+1, y0, y1, fondL)


CAS_G = [
    ("ref4", "REF4 « LEGERE »  (.qui small, g-mild)    ", 90, 500, 1610, 1650, 760, 1605),
    ("c24",  "C24  « MODEREE » (.qui small, g-moderate)", 88, 500, 1860, 1890, 760, 1800),
    ("l24",  "L24  « MODEREE » (.qui small, g-moderate)", 88, 500, 1843, 1872, 760, 1790),
]
for cle, nom, x0, x1, y0, y1, xf, yf in CAS_G:
    im = ouvrir(cle)
    f = luminance_simple(mediane_fenetre(im, xf, yf, 3))
    e = encre(im, x0, x1, y0, y1, f)
    c = capitale_finale(im, x0, x1, y0, y1, f)
    nb = 6 if "LEGERE" in nom else 7
    print(f"   {nom} mot x[{e['x0']},{e['x1']}] larg={e['w']:3d}px ({css(e['w']):5.2f}CSS) "
          f"haut={e['h']:3d}px  largeur/lettre={e['w']/nb:5.1f}px  "
          f"CAPITALE FINALE 'E' : haut={c['h']:2d}px ({css(c['h']):4.2f}CSS) larg={c['w']:2d}px  "
          f"couleur={mediane_fenetre(im, (e['x0']+e['x1'])//2, (e['y0']+e['y1'])//2, 1)}")
