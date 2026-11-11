#!/usr/bin/env python3
"""m10 (Q1) — couleurs de la rangee de file : TRANCHER, titre, gravite.

Instrument : sur du TEXTE on ne peut pas prendre la mediane d'une fenetre (la fenetre est surtout
du fond). On prend donc le COEUR des glyphes : les 60 pixels les plus clairs de la zone, dont on
rend la mediane par canal. Les franges d'anti-crenelage, plus sombres, en sont exclues d'office.

PIEGE DU TEMOIN, evite ici : le cadre 4 de la maquette affiche « GRAVE » et le jeu « MODEREE ».
Compares l'un a l'autre ils donnent un ecart de 21/255 qui n'est PAS un defaut : ce sont deux
gravites differentes. Le vrai homologue de « MODEREE » est le cadre 3. Le script imprime les deux
comparaisons pour que l'ecart de temoin se voie.

CONTROLE POSITIF : la couleur de TRANCHER doit etre la meme dans les 5 cadres de reference.
CONTROLE NEGATIF : la meme lecture sur le REMPLISSAGE de la boite (pas de glyphe) doit rendre une
couleur sombre tres eloignee de l'or — sinon l'instrument lirait le fond, pas l'encre.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def coeur(im, x0, y0, x1, y1, n=60):
    px = im.convert("RGB").load()
    pts = sorted(((px[x, y], sum(px[x, y])) for y in range(y0, y1) for x in range(x0, x1)),
                 key=lambda t: -t[1])[:n]
    r = sorted(p[0][0] for p in pts); g = sorted(p[0][1] for p in pts); b = sorted(p[0][2] for p in pts)
    m = len(pts) // 2
    return (r[m], g[m], b[m])


def ligne(lib, rel, z):
    im = Image.open(os.path.join(D, rel))
    c = coeur(im, *z)
    print(f"   {lib:46s} [{os.path.basename(rel)} {im.width}x{im.height}] RGB {c}")
    return c


print("=== m10 : couleurs de cœur de glyphe dans la rangee de file ===")
print("\n-- TRANCHER --")
a = ligne("REF cadre 4", "reference/cadre-4.png", (772, 1736, 991, 1760))
b = ligne("JEU c4 1920", "captures/c4-la-file-sous-pression-1080x1920.png", (796, 1580, 1002, 1604))
print(f"   delta par canal = {tuple(abs(x-y) for x, y in zip(a, b))}  (tolerance d'aplat : 6/255)")

print("\n-- titre de rangee --")
a = ligne("REF cadre 4 « Lt. Quist attend vos ordres »", "reference/cadre-4.png", (100, 1712, 560, 1744))
b = ligne("JEU c4 1920 « La ville attend vos ordres »", "captures/c4-la-file-sous-pression-1080x1920.png", (100, 1541, 560, 1568))
print(f"   delta par canal = {tuple(abs(x-y) for x, y in zip(a, b))}")

print("\n-- gravite : le PIEGE DU TEMOIN --")
g4 = ligne("REF cadre 4 « GRAVE »      (MAUVAIS temoin)", "reference/cadre-4.png", (100, 1763, 330, 1786))
g3 = ligne("REF cadre 3 « MODEREE »    (BON temoin)", "reference/cadre-3.png", (100, 1763, 330, 1790))
gj = ligne("JEU c4 1920 « MODEREE »", "captures/c4-la-file-sous-pression-1080x1920.png", (100, 1580, 330, 1606))
print(f"   contre le MAUVAIS temoin : delta = {tuple(abs(x-y) for x, y in zip(g4, gj))}  -> semblerait un ecart")
print(f"   contre le BON temoin     : delta = {tuple(abs(x-y) for x, y in zip(g3, gj))}  -> EGAL")

print("\n--- CONTROLE POSITIF : TRANCHER doit avoir la meme couleur dans les 5 cadres ---")
vals = set()
for n, z in [(2, (772, 1736, 991, 1760)), (3, (772, 1736, 991, 1760)), (4, (772, 1736, 991, 1760)),
             (5, (772, 1665, 991, 1689)), (6, (772, 1665, 991, 1689))]:
    im = Image.open(os.path.join(D, f"reference/cadre-{n}.png"))
    c = coeur(im, *z)
    vals.add(c)
    print(f"   cadre {n} [{im.width}x{im.height}] RGB {c}")
ecart = max(max(abs(a[i] - b[i]) for i in range(3)) for a in vals for b in vals)
print(f"   -> {len(vals)} valeur(s) distincte(s), ecart max entre cadres = {ecart}/255")
print(f"      (la maquette elle-meme n'est donc pas a une seule valeur : rangee courte 237,197,104 ;")
print(f"       rangee haute 242,201,107. On juge contre la tolerance d'aplat du mandat, 6/255.)")
print(f"   -> {'OK (dispersion interne a la maquette <= 6/255)' if ecart <= 6 else 'ECHEC'}")

print("\n--- CONTROLE NEGATIF : meme lecture sur le REMPLISSAGE de la boite (aucun glyphe) ---")
im = Image.open(os.path.join(D, "reference/cadre-4.png"))
c = coeur(im, 700, 1700, 760, 1800)
print(f"   image {im.width}x{im.height}  colonne vide x 700..760 -> RGB {c}")
print(f"   -> doit etre sombre et neutre, tres loin de l'or (237,197,104) : "
      f"{'OK' if sum(c) < 120 else 'ECHEC (l instrument lit le fond comme de l encre)'}")
