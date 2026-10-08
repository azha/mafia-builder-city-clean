#!/usr/bin/env python3
"""08 — HAUTEUR DE CAPITALE (ce que l'oeil voit), pas une taille nominale.

Methode : dans une bande de texte connue, on isole le PREMIER glyphe a gauche
(colonnes d'encre contigues jusqu'a un blanc de >= 4 colonnes) et on mesure son
bbox d'encre. On choisit volontairement des premieres lettres CAPITALES SANS
accent ni jambage (L, M, P, D, C, U, V, B) : la bande entiere, elle, ment des
qu'un accent ou une descendante entre.

CONTROLE POSITIF : « Plusieurs attendent encore » (.plus, 7,6 px) est la MEME chaine
dans la reference et dans le jeu -> la capitale P doit coincider si la fonte est la meme.
CONTROLE NEGATIF : le titre serif (16 px) et le label (6,6 px) doivent rendre des
hauteurs tres differentes — un instrument qui les egalise ne mesure rien.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def glyphe(im, x0, x1, y0, y1, fondL, marge=12, trou=4):
    """premier glyphe depuis la gauche dans la fenetre ; renvoie son bbox d'encre."""
    px = im.load()
    seuil = fondL + marge
    cols = []
    for x in range(x0, x1):
        n = sum(1 for y in range(y0, y1) if luminance_simple(px[x, y]) > seuil)
        cols.append((x, n))
    debut = None
    fin = None
    vide = 0
    for x, n in cols:
        if n > 0:
            if debut is None:
                debut = x
            fin = x
            vide = 0
        elif debut is not None:
            vide += 1
            if vide >= trou:
                break
    if debut is None:
        return None
    ys = [y for y in range(y0, y1)
          for x in range(debut, fin+1) if luminance_simple(px[x, y]) > seuil]
    if not ys:
        return None
    return dict(x0=debut, x1=fin, y0=min(ys), y1=max(ys),
                h=max(ys)-min(ys)+1, w=fin-debut+1)


def fond(im, x, y, r=3):
    return luminance_simple(mediane_fenetre(im, x, y, r))


# (cle, role, lettre, x0,x1, y0,y1, x_fond,y_fond)
CAS = [
    # --- ligne de file (.suivant) : REF x[46,1033] y[1531,1825] ; JEU x[47,1032] ---
    ("ref4", "file: titre  Lt.    'L'", 95, 400, 1565, 1602, 700, 1560),
    ("c24",  "file: titre  Lt.    'L'", 95, 400, 1822, 1857, 700, 1800),
    ("l24",  "file: titre  Lt.    'L'", 95, 400, 1805, 1840, 700, 1790),
    ("ref4", "file: gravite       'L'", 95, 400, 1611, 1647, 700, 1600),
    ("c24",  "file: gravite       'M'", 95, 400, 1861, 1887, 700, 1800),
    ("l24",  "file: gravite       'M'", 95, 400, 1844, 1870, 700, 1790),
    ("ref4", "file: plusieurs     'P'", 95, 400, 1758, 1789, 700, 1750),
    ("c24",  "file: plusieurs     'P'", 95, 400, 1966, 1996, 700, 1800),
    ("l24",  "file: plusieurs     'P'", 95, 400, 1983, 2013, 700, 1790),
    # --- plaque LA SUITE : rangee 1, titre serif ---
    ("ref4", "suite: titre r1     'L'", 95, 400, 798, 846, 700, 790),
    ("c24",  "suite: titre r1     'L'", 95, 400, 1034, 1082, 700, 1030),
    # --- plaque LA SUITE : rangee 3 (meme chaine REF/JEU : « De l'argent attend dans la planque ») ---
    ("ref4", "suite: titre r3     'D'", 95, 400, 1229, 1277, 700, 1225),
    ("c24",  "suite: titre r3     'D'", 95, 400, 1204, 1252, 700, 1200),
    ("ref4", "suite: raison r3    'B'", 95, 400, 1275, 1320, 700, 1225),
    ("c24",  "suite: raison r3    'B'", 95, 400, 1290, 1335, 700, 1200),
    # --- carte de TETE : titre serif or ---
    ("ref5", "tete: titre serif   'U'", 300, 800, 842, 896, 700, 830),
    ("l24",  "tete: titre serif   'D'", 150, 800, 1358, 1424, 700, 1340),
    # --- carte de TETE : niveaux PORTEE ---
    ("ref5", "tete: PORTEE        'P'", 180, 600, 1001, 1038, 700, 990),
    ("l24",  "tete: PORTEE        'P'", 180, 600, 1451, 1487, 700, 1440),
]

print("=== 08 — hauteurs de capitale ===")
res = {}
for cle, role, x0, x1, y0, y1, xf, yf in CAS:
    im = ouvrir(cle)
    f = fond(im, xf, yf)
    g = glyphe(im, x0, x1, y0, y1, f)
    if not g:
        print(f"   {cle:5s} {role:24s} AUCUN GLYPHE dans x[{x0},{x1}] y[{y0},{y1}]")
        continue
    res[(cle, role[:12])] = g
    print(f"   {cle:5s} {role:24s} bbox x[{g['x0']},{g['x1']}] y[{g['y0']},{g['y1']}]  "
          f"HAUTEUR={g['h']:3d}px = {css(g['h']):5.2f} CSS   largeur={g['w']:3d}px = {css(g['w']):5.2f} CSS  (fondL={f:.1f})")

print()
print("=== COMPARAISONS (px image, echelle x3,6 des deux cotes) ===")
PAIRES = [
    ("file: titre", "ref4", "c24", "titre de la ligne de file (.qui, 9,6 px)"),
    ("file: gravit", "ref4", "c24", "niveau de gravite (.qui small, 7,6 px) — L vs M"),
    ("file: plusie", "ref4", "c24", "« Plusieurs attendent encore » (.plus, 7,6 px) — MEME CHAINE"),
    ("suite: titre", "ref4", "c24", "titre de rangee (.t4 b, serif 11 px) — rangee 1"),
    ("suite: raiso", "ref4", "c24", "raison de rangee (.t4 span, 8,4 px) — MEME CHAINE"),
    ("tete: titre ", "ref5", "l24", "titre de la carte de tete (.titre, serif 16 px)"),
    ("tete: PORTEE", "ref5", "l24", "libelle PORTEE (.niveaux span, 6,6 px) — MEME CHAINE"),
]
for k, a, b, lib in PAIRES:
    ga, gb = res.get((a, k)), res.get((b, k))
    if not ga or not gb:
        print(f"   {lib:58s} INCOMPLET"); continue
    d = gb['h'] - ga['h']
    print(f"   {lib:58s} REF={ga['h']:3d}px({css(ga['h']):5.2f}CSS)  JEU={gb['h']:3d}px({css(gb['h']):5.2f}CSS)  "
          f"delta={d:+4d}px ({100*d/ga['h']:+6.1f} %)  "
          f"{'EGAL' if abs(d) <= max(1, 0.05*ga['h']) else 'ECART'}")
