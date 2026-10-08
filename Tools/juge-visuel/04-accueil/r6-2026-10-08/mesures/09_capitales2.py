#!/usr/bin/env python3
"""09 — hauteur de capitale, version CORRIGEE.

Le 08 a mesure FAUX sur la reference : le soulignement POINTILLE de l'atelier
(`.acc4 .prop{text-decoration:underline dotted}` — « un mot souligne en pointille est
PROPOSE, NON RATIFIE », en-tete de la page atelier) ajoute une ligne d'encre 2 px CSS
sous la ligne de base et gonflait le bbox. Ici on separe les RUNS DE LIGNES : le run le
plus HAUT est la lettre, le run suivant est le soulignement.

Methode : fenetre x serree sur la 1re capitale (sans accent ni jambage), profil de
lignes, runs separes par >= 2 lignes vides.

CONTROLE POSITIF : « Plusieurs attendent encore » (.plus) est la MEME chaine des deux
cotes et n'est PAS soulignee -> doit rester EGAL (il l'etait deja au 08 : 21 px / 21 px).
CONTROLE NEGATIF : sur la reference, le run SOULIGNEMENT doit exister pour les textes
.prop et NE PAS exister pour .plus — sinon l'instrument invente des runs.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def runs_lignes(im, x0, x1, y0, y1, fondL, marge=12, trou=2):
    px = im.load()
    seuil = fondL + marge
    out, cur, vide = [], None, 0
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if luminance_simple(px[x, y]) > seuil)
        if n > 0:
            cur = [y, y, n] if cur is None else [cur[0], y, max(cur[2], n)]
            vide = 0
        else:
            if cur is not None:
                vide += 1
                if vide >= trou:
                    out.append(tuple(cur)); cur = None
    if cur:
        out.append(tuple(cur))
    return out


def premiere_colonne(im, x0, x1, y0, y1, fondL, marge=12):
    px = im.load()
    seuil = fondL + marge
    for x in range(x0, x1):
        if any(luminance_simple(px[x, y]) > seuil for y in range(y0, y1)):
            return x
    return None


def fond(im, x, y, r=3):
    return luminance_simple(mediane_fenetre(im, x, y, r))


# (cle, role, xcherche0, xcherche1, y0, y1, largeur de la fenetre lettre, xfond, yfond)
CAS = [
    ("ref4", "file titre  .qui  'L'",  95, 300, 1560, 1610, 26, 700, 1555),
    ("c24",  "file titre  .qui  'L'",  90, 300, 1820, 1860, 26, 700, 1800),
    ("ref4", "file gravite small 'L'", 95, 300, 1610, 1655, 26, 700, 1605),
    ("c24",  "file gravite small 'M'", 90, 300, 1860, 1890, 26, 700, 1800),
    ("ref4", "file .plus        'P'",  95, 300, 1755, 1800, 22, 700, 1750),
    ("c24",  "file .plus        'P'",  90, 300, 1962, 2000, 22, 700, 1800),
    ("ref4", "suite titre r1    'L'",  95, 300, 798,  860,  30, 700, 790),
    ("c24",  "suite titre r1    'L'",  90, 300, 1034, 1090, 30, 700, 1030),
    ("ref4", "suite titre r3    'D'",  95, 300, 1228, 1290, 34, 700, 1222),
    ("c24",  "suite titre r3    'D'",  90, 300, 1204, 1260, 34, 700, 1200),
    ("ref4", "suite raison r3   'B'",  95, 300, 1276, 1330, 24, 700, 1222),
    ("c24",  "suite raison r3   'B'",  90, 300, 1306, 1345, 24, 700, 1200),
    ("ref4", "suite sur LA SUITE'L'",  370, 700, 722, 765,  22, 700, 715),
    ("c24",  "suite sur LA SUITE'L'",  370, 700, 964, 995,  22, 700, 1000),
    ("ref5", "tete titre serif  'U'",  300, 800, 840, 900,  48, 700, 830),
    ("l24",  "tete titre serif  'D'",  150, 800, 1356, 1430, 48, 700, 1340),
    ("ref5", "tete .sur CE QU'ON'C'",  300, 800, 1070, 1115, 22, 700, 1065),
]

print("=== 09 — hauteur de capitale (runs de lignes separes) ===")
res = {}
for cle, role, xa, xb, y0, y1, larg, xf, yf in CAS:
    im = ouvrir(cle)
    f = fond(im, xf, yf)
    x0 = premiere_colonne(im, xa, xb, y0, y1, f)
    if x0 is None:
        print(f"   {cle:5s} {role:24s} AUCUNE ENCRE dans x[{xa},{xb}] y[{y0},{y1}] (fondL={f:.1f})")
        continue
    rs = runs_lignes(im, x0, x0+larg, y0, y1, f)
    if not rs:
        print(f"   {cle:5s} {role:24s} AUCUN RUN"); continue
    cap = rs[0]
    h = cap[1]-cap[0]+1
    res[(cle, role[:14])] = h
    sup = f"  + {len(rs)-1} run(s) sous la ligne de base : {[(r[0],r[1]) for r in rs[1:]]}" if len(rs) > 1 else "  (aucun soulignement)"
    print(f"   {cle:5s} {role:24s} lettre a x={x0}  run_haut y[{cap[0]},{cap[1]}]  "
          f"HAUTEUR={h:3d}px = {css(h):5.2f} CSS{sup}")

print()
print("=== COMPARAISONS ===")
PAIRES = [
    ("file titre  .q", "ref4", "c24", "titre de la ligne de file (.qui 9,6px) 'L' de Lt."),
    ("file gravite s", "ref4", "c24", "niveau de gravite (.qui small 7,6px) 'L'/'M'"),
    ("file .plus    ", "ref4", "c24", "'Plusieurs attendent encore' (.plus 7,6px) MEME CHAINE"),
    ("suite titre r1", "ref4", "c24", "titre de rangee serif (.t4 b 11px) 'L'"),
    ("suite titre r3", "ref4", "c24", "titre de rangee serif (.t4 b 11px) 'D' MEME CHAINE"),
    ("suite raison r", "ref4", "c24", "raison de rangee (.t4 span 8,4px) 'B' MEME CHAINE"),
    ("suite sur LA S", "ref4", "c24", "'LA SUITE' (.sur 6,6px) MEME CHAINE"),
]
for k, a, b, lib in PAIRES:
    ha, hb = res.get((a, k)), res.get((b, k))
    if ha is None or hb is None:
        print(f"   {lib:58s} INCOMPLET ({ha},{hb})"); continue
    d = hb - ha
    tol = max(1, 0.05*ha)
    print(f"   {lib:58s} REF={ha:3d}px({css(ha):5.2f}CSS) JEU={hb:3d}px({css(hb):5.2f}CSS) "
          f"delta={d:+4d}px ({100*d/ha:+6.1f}%) {'EGAL' if abs(d) <= tol else 'ECART'}")
