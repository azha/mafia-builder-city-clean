#!/usr/bin/env python3
"""m4 (Q1 + Q2) — les LIGNES DE TEXTE de la rangee de file, colonne gauche (hors TRANCHER).

Instrument : dans la boite de rangee mesuree par m3, on ne garde que la colonne gauche
(x 60..700 : TRANCHER commence a x=772 en reference et x=796 en jeu, cf. m2) et on compte par
ligne y les pixels dont la luminance depasse le remplissage de la boite + 14. Les bandes
consecutives = les lignes de texte. On imprime aussi la hauteur de capitale de chaque bande.

CONTROLE POSITIF : sur reference/cadre-2.png la maquette ecrit 2 lignes (.qui + small) ->
l'instrument doit trouver exactement 2 bandes. Sur cadre-6 elle en ecrit 4 (.qui, small, .rep sur
2 lignes de rendu, .plus) -> l'instrument doit en trouver 5 (le .rep occupe 2 lignes de rendu).
CONTROLE NEGATIF : la meme recherche 40 px SOUS la boite (fond de ville, aucun texte de rangee)
doit rendre 0 bande.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def fond_boite(px, bx0, by0):
    """remplissage de la boite : mediane d'une fenetre 12x12 juste a l'interieur du coin haut-gauche,
    a >= 3 px de tout bord (regle du mandat sur la frange d'anti-crenelage)."""
    v = []
    for y in range(by0 + 6, by0 + 18):
        for x in range(bx0 + 6, bx0 + 18):
            v.append(sum(px[x, y][:3]) / 3)
    v.sort()
    return v[len(v) // 2]


def bandes_texte(im, bx0, bx1, by0, by1, xg0, xg1, marge=14):
    px = im.convert("RGB").load()
    base = fond_boite(px, bx0, by0)
    seuil = base + marge
    bandes, cur = [], None
    # on exclut 8 px de chaque bord : le LISERE de la boite est de l'encre pour le seuil,
    # mais ce n'est pas une ligne de texte (il sortait en L1 et Ln).
    for y in range(by0 + 8, by1 - 7):
        n = sum(1 for x in range(xg0, xg1) if sum(px[x, y][:3]) / 3 > seuil)
        if n >= 3:
            cur = [y, y + 1] if cur is None else [cur[0], y + 1]
        else:
            if cur: bandes.append(tuple(cur)); cur = None
    if cur: bandes.append(tuple(cur))
    return base, seuil, bandes


CAS = [
    ("reference/cadre-2.png", "REF cadre 2", 46, 1033, 1675, 1825, 60, 700),
    ("reference/cadre-4.png", "REF cadre 4", 46, 1033, 1675, 1825, 60, 700),
    ("reference/cadre-5.png", "REF cadre 5", 46, 1033, 1533, 1825, 60, 700),
    ("reference/cadre-6.png", "REF cadre 6", 46, 1033, 1533, 1825, 60, 700),
    ("captures/c4-la-file-sous-pression-1080x1920.png", "JEU c4 1920", 47, 1032, 1523, 1660, 60, 700),
    ("captures/c6-carte-de-tete-au-dessus-de-la-file-1080x1920.png", "JEU c6 1920", 47, 1032, 1523, 1660, 60, 700),
    ("captures/c4-la-file-sous-pression-1080x2400.png", "JEU c4 2400", 47, 1032, 2003, 2140, 60, 700),
    ("captures/c6-carte-de-tete-au-dessus-de-la-file-1080x2400.png", "JEU c6 2400", 47, 1032, 2003, 2140, 60, 700),
]

print("=== m4 : lignes de texte de la rangee de file (colonne gauche, hors TRANCHER) ===")
for rel, lib, bx0, bx1, by0, by1, xg0, xg1 in CAS:
    im = Image.open(os.path.join(D, rel))
    base, seuil, b = bandes_texte(im, bx0, bx1, by0, by1, xg0, xg1)
    print(f"\n{lib}  [{rel}]  image {im.width}x{im.height}")
    print(f"   boite y {by0}..{by1} ; fond mediane L={base:.1f} ; seuil d'encre L>{seuil:.1f}")
    print(f"   {len(b)} bande(s) de texte :")
    for i, (a, z) in enumerate(b, 1):
        print(f"      L{i}: y {a}..{z-1}  hauteur {z-a}px img = {(z-a)/3.6:.1f} px CSS")
    if len(b) >= 2:
        ecarts = [b[i + 1][0] - b[i][0] for i in range(len(b) - 1)]
        print(f"   pas entre debuts de ligne = {ecarts} px img = "
              f"{[round(e/3.6,1) for e in ecarts]} px CSS")

print("\n--- CONTROLE POSITIF : REF cadre 2 doit donner 2 bandes, REF cadre 6 doit en donner 5 "
      "(.rep se rend sur 2 lignes) -> lire ci-dessus ---")
print("--- CONTROLE NEGATIF : meme instrument, meme boite, mais colonne VIDE x 735..768 ---")
print("    (entre la fin du texte de gauche et le debut de TRANCHER a x=772 : aucun glyphe)")
im = Image.open(os.path.join(D, "reference/cadre-4.png"))
base, seuil, b = bandes_texte(im, 46, 1033, 1675, 1825, 735, 768)
print(f"   image {im.width}x{im.height}  bandes trouvees dans la colonne vide = {len(b)} {b}  "
      f"-> attendu 0 : {'OK' if len(b) == 0 else 'ECHEC (instrument non discriminant)'}")
