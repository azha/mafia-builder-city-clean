#!/usr/bin/env python3
"""14 — couleur d'encre des textes (coeur de glyphe) + CONTRASTE WCAG sur le fond REEL.

Couleur d'encre : mediane des pixels du DECILE le plus clair de la ligne — le coeur des
glyphes, jamais la frange d'anti-crenelage (mandat : echantillonner a >= 3 px de tout bord ;
sur du texte, le seul « loin du bord » disponible est le coeur du trait).
Fond : mediane d'une fenetre 9x9 de l'aplat de la carte, a >= 3 px de toute encre.
Contraste : formule WCAG sur les deux couleurs mesurees.

Doctrine (dossier.md L91-92) : >= 3:1 grands textes, >= 4,5:1 petits ; les maquettes sont
au vert sur les 152 cadres (garde atelier 4bd3ea2), DONC un texte sous le seuil dans le JEU
est un ecart.

CONTROLE POSITIF : le liseré laiton du haut de plaque mesure #b08d3e = (176,141,62) des
deux cotes (mesure 07) -> l'echantillonnage de couleur n'est pas biaise.
CONTROLE NEGATIF : le contraste du FOND contre LUI-MEME doit valoir 1,00.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre, contraste


def encre_coeur(im, x0, x1, y0, y1, part=0.10):
    """mediane RGB du decile le plus clair de la fenetre."""
    px = im.load()
    pts = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]
            pts.append((luminance_simple(p), p))
    if not pts:
        return None
    pts.sort(key=lambda t: -t[0])
    k = max(1, int(len(pts) * part))
    top = [p for _, p in pts[:k]]
    out = []
    for i in range(3):
        c = sorted(q[i] for q in top)
        out.append(c[len(c)//2])
    return tuple(out)


# (cle, libelle, x0,x1,y0,y1 de la ligne, x,y du fond)
CAS = [
    ("ref4", "file titre .qui            ", 86, 520, 1568, 1600, 700, 1555),
    ("c24",  "file titre .qui            ", 78, 530, 1825, 1855, 700, 1800),
    ("ref4", "file gravite small         ", 86, 215, 1614, 1645, 700, 1605),
    ("c24",  "file gravite small         ", 78, 185, 1864, 1886, 700, 1860),
    ("ref4", "file raison .rep           ", 86, 700, 1663, 1705, 700, 1655),
    ("c24",  "file raison .rep           ", 78, 700, 1894, 1929, 700, 1890),
    ("ref4", "file .plus                 ", 86, 460, 1760, 1788, 700, 1750),
    ("c24",  "file .plus                 ", 78, 445, 1968, 1994, 700, 1965),
    ("ref4", "file .act TRANCHER         ", 760, 1000, 1663, 1705, 700, 1655),
    ("c24",  "file .act TRANCHER         ", 760, 1010, 1894, 1929, 700, 1890),
    ("ref4", "suite .sur LA SUITE        ", 440, 640, 726, 748, 700, 715),
    ("c24",  "suite .sur LA SUITE        ", 450, 630, 968, 990, 700, 1000),
    ("ref4", "suite titre rangee (serif) ", 95, 640, 1232, 1270, 760, 1222),
    ("c24",  "suite titre rangee (serif) ", 92, 600, 1206, 1243, 760, 1198),
    ("ref4", "suite raison rangee        ", 95, 640, 1338, 1376, 760, 1222),
    ("c24",  "suite raison rangee        ", 92, 660, 1305, 1345, 760, 1198),
    ("ref5", "tete titre serif or        ", 300, 790, 846, 894, 700, 830),
    ("l24",  "tete titre serif or        ", 230, 850, 1360, 1412, 700, 1340),
    ("ref5", "tete .niveaux libelle      ", 218, 350, 1012, 1038, 700, 995),
    ("l24",  "tete .niveaux libelle      ", 222, 352, 1452, 1478, 700, 1440),
    ("ref5", "tete .niveaux valeur serif ", 360, 520, 1005, 1040, 700, 995),
    ("l24",  "tete .niveaux valeur serif ", 365, 530, 1448, 1484, 700, 1440),
]

print("=== 14 — couleur d'encre et contraste ===")
for cle, lib, x0, x1, y0, y1, xf, yf in CAS:
    im = ouvrir(cle, bavard=False)
    enc = encre_coeur(im, x0, x1, y0, y1)
    fon = mediane_fenetre(im, xf, yf, 4)
    c = contraste(enc, fon)
    seuil = 3.0 if "serif or" in lib or "titre rangee" in lib else 4.5
    print(f"   [{im.size[0]}x{im.size[1]}] {cle:5s} {lib} encre={str(enc):16s} fond={str(fon):16s} "
          f"contraste={c:5.2f}:1  seuil={seuil}  {'OK' if c >= seuil else '*** SOUS LE SEUIL ***'}")

print()
print("=== CONTROLE NEGATIF : contraste du fond contre lui-meme ===")
im = ouvrir("c24")
f = mediane_fenetre(im, 700, 1800, 4)
print(f"   fond={f} contre lui-meme = {contraste(f, f):.2f}:1  -> {'OK (1,00)' if abs(contraste(f,f)-1) < 0.01 else 'ECHEC'}")
print("=== CONTROLE POSITIF : liseré laiton = #b08d3e des deux cotes (mesure 07) ===")
for cle, y in (("ref4", 684), ("ref5", 774), ("c24", 927), ("l24", 1312)):
    im = ouvrir(cle, bavard=False)
    print(f"   {cle} y={y} : {mediane_fenetre(im, 540, y, 2)}  (attendu (176,141,62))")
