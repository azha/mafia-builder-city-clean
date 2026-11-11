#!/usr/bin/env python3
"""m3 (Q1) — la BOITE de la rangee de file, et ou tombe TRANCHER dedans.

Instrument : la boite de rangee est cernee d'un LISERE clair (L>=40) sur un fond sombre (L<=30).
On lit les liseres haut/bas sur une colonne x choisie DANS la boite mais hors texte, et les
liseres gauche/droit sur la ligne mediane. Les grandeurs sont rendues en px CSS (/3,6) et en
% de la largeur d'ecran (dossier.md : 1 px CSS = 3,6 px d'image DES DEUX COTES).

CONTROLE POSITIF : la largeur de la boite doit etre la meme dans TOUS les cadres de reference
(la maquette dessine la meme rangee) -> les 4 cadres doivent donner le meme x0..x1.
CONTROLE NEGATIF : la meme recherche de liseres sur une colonne de PLEIN CIEL (x=540, y 300..600,
reference/cadre-1.png : du ciel nocturne, aucun liseré) doit rendre une liste VIDE.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def liseres_col(im, x, y0, y1, seuil=40):
    px = im.convert("RGB").load()
    ys = [y for y in range(y0, y1) if sum(px[x, y][:3]) / 3 >= seuil]
    grp, cur = [], None
    for y in ys:
        if cur and y == cur[1]:
            cur = (cur[0], y + 1)
        else:
            if cur: grp.append(cur)
            cur = (y, y + 1)
    if cur: grp.append(cur)
    return grp


def liseres_lig(im, y, x0, x1, seuil=40):
    px = im.convert("RGB").load()
    xs = [x for x in range(x0, x1) if sum(px[x, y][:3]) / 3 >= seuil]
    grp, cur = [], None
    for x in xs:
        if cur and x == cur[1]:
            cur = (cur[0], x + 1)
        else:
            if cur: grp.append(cur)
            cur = (x, x + 1)
    if cur: grp.append(cur)
    return grp


# (chemin, libelle, colonne, fenetre y, bbox or de TRANCHER mesuree par m2, nb de lignes de texte)
CAS = [
    ("reference/cadre-2.png", "REF cadre 2 (2 lignes de texte)", 1000, (1660, 1900), (1736, 1759), 2),
    ("reference/cadre-3.png", "REF cadre 3 (2 lignes)", 1000, (1660, 1900), (1736, 1759), 2),
    ("reference/cadre-4.png", "REF cadre 4 (2 lignes)", 1000, (1660, 1900), (1736, 1759), 2),
    ("reference/cadre-5.png", "REF cadre 5 (4 lignes, avec .rep)", 1000, (1520, 1900), (1665, 1688), 4),
    ("reference/cadre-6.png", "REF cadre 6 (4 lignes, avec .rep)", 1000, (1520, 1900), (1665, 1688), 4),
    ("captures/c4-la-file-sous-pression-1080x1920.png", "JEU c4 1920 (3 lignes)", 1020, (1480, 1720), (1580, 1603), 3),
    ("captures/c6-carte-de-tete-au-dessus-de-la-file-1080x1920.png", "JEU c6 1920 (3 lignes)", 1020, (1480, 1720), (1580, 1603), 3),
    ("captures/c4-la-file-sous-pression-1080x2400.png", "JEU c4 2400 (3 lignes)", 1020, (1960, 2200), (2061, 2083), 3),
    ("captures/c6-carte-de-tete-au-dessus-de-la-file-1080x2400.png", "JEU c6 2400 (3 lignes)", 1020, (1960, 2200), (2061, 2083), 3),
]

print("=== m3 : boite de la rangee de file + centrage vertical de TRANCHER ===")
res = {}
for rel, lib, xc, (y0, y1), tr, nlig in CAS:
    im = Image.open(os.path.join(D, rel))
    g = liseres_col(im, xc, y0, y1)
    print(f"\n{lib}\n   [{rel}]  image {im.width}x{im.height}  colonne x={xc}")
    print(f"   liseres horizontaux (y) = {g}")
    if len(g) < 2:
        print("   -> boite non trouvee"); continue
    by0 = g[0][0]; by1 = g[-1][1] - 1
    ym = (by0 + by1) // 2
    # x limite a 20..1060 : au-dela on retrouve le CADRE EXTERIEUR du telephone (L=70),
    # qui n'est pas la boite de rangee. Verifie a la main : ref cadre-4 y=1748 -> 46,47,48 (L55)
    # et 1031,1032,1033 (L55), puis 1077,1078 (L70) = cadre du telephone.
    gl = liseres_lig(im, ym, 20, 1060)
    if len(gl) < 2:
        print(f"   liseres verticaux introuvables sur y={ym} : {gl}"); continue
    bx0, bx1 = gl[0][0], gl[-1][1] - 1
    h = by1 - by0 + 1
    w = bx1 - bx0 + 1
    print(f"   BOITE  x={bx0}..{bx1} (l={w}px img = {w/3.6:.1f} px CSS = {100*w/im.width:.1f}% ecran)")
    print(f"          y={by0}..{by1} (h={h}px img = {h/3.6:.1f} px CSS)   {nlig} lignes de texte")
    print(f"          hauteur par ligne de texte = {h/nlig/3.6:.1f} px CSS")
    cyb, cyt = (by0 + by1) / 2, (tr[0] + tr[1] - 1) / 2
    off = cyt - cyb
    print(f"   TRANCHER  bbox y={tr[0]}..{tr[1]-1}  centre={cyt:.1f}  ;  centre boite={cyb:.1f}")
    print(f"             decalage vertical = {off:+.1f} px img = {off/3.6:+.2f} px CSS "
          f"= {100*off/h:+.1f}% de la hauteur de boite")
    print(f"             entierement dans la boite ? {'OUI' if by0 < tr[0] and tr[1] <= by1 else 'NON — DEBORDE'}")
    print(f"             marge a DROITE (bord interieur de la boite) : voir m2 ; bord droit boite = {bx1}")
    res[lib] = (bx0, bx1, by0, by1)

print("\n--- CONTROLE POSITIF : les 5 cadres de reference doivent donner la MEME boite en x ---")
xs = {k: (v[0], v[1]) for k, v in res.items() if k.startswith("REF")}
print(f"   {xs}")
print(f"   -> {'OK (une seule valeur)' if len(set(xs.values())) == 1 else 'ECHEC'}")

print("\n--- CONTROLE NEGATIF : colonne de plein ciel (reference/cadre-1.png, x=540, y 300..600) ---")
im = Image.open(os.path.join(D, "reference/cadre-1.png"))
g = liseres_col(im, 540, 300, 600)
print(f"   image {im.width}x{im.height}  liseres trouves = {g}  -> attendu [] : "
      f"{'OK' if g == [] else 'ECHEC (instrument non discriminant)'}")
