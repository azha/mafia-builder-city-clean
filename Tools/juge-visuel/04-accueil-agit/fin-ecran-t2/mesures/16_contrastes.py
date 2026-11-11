#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""16 — CONTRASTES WCAG sur le fond REEL (doctrine du dossier : >= 4,5:1 petits textes,
>= 3:1 grands textes).

Methode : dans une fenetre qui ne contient QUE le texte vise,
  - couleur d'encre   = mediane des pixels du decile le plus eloigne du fond (coeur du trait,
                        jamais la frange d'anti-crenelage) ;
  - couleur de fond   = mediane des pixels du decile le plus proche du fond.
Le ratio WCAG est calcule sur les deux.

Contrôles :
  POSITIF — le meme texte mesure dans la REFERENCE doit donner un ratio proche de celui de la
            capture quand les deux couleurs sont les memes (c'est le cas du titre de carte).
  NEGATIF — une fenetre de papier vierge doit rendre un ratio ~1,0 (pas de texte, pas de contraste).
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")


def srgb_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def Lrel(p):
    return 0.2126 * srgb_lin(p[0]) + 0.7152 * srgb_lin(p[1]) + 0.0722 * srgb_lin(p[2])


def ratio(a, b):
    la, lb = Lrel(a), Lrel(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


def mesure(path, nom, x0, x1, y0, y1, encre_sombre=True, seuil_grand=False):
    im = Image.open(path)
    px = im.convert("RGB").load()
    pts = [px[x, y] for y in range(y0, y1) for x in range(x0, x1)]
    pts.sort(key=Lrel)
    n = len(pts)
    d = max(1, n // 10)
    if encre_sombre:
        encre = pts[:d]
        fond = pts[-d:]
    else:
        encre = pts[-d:]
        fond = pts[:d]

    def medcol(l):
        return tuple(sorted(c[i] for c in l)[len(l) // 2] for i in range(3))
    e = medcol(encre)
    f = medcol(fond)
    r = ratio(e, f)
    seuil = 3.0 if seuil_grand else 4.5
    verdict = "OK" if r >= seuil else "SOUS LE PLANCHER (%.1f)" % seuil
    print("  %-44s encre=%-16s fond=%-16s  ratio=%5.2f:1  [seuil %.1f] %s   [%s %s]" %
          (nom, str(e), str(f), r, seuil, verdict, os.path.basename(path)[:24], im.size))
    return r


R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
R7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G03 = os.path.join(CAP, "G03_ApresGeste_deja_tranchee_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G05 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G06 = os.path.join(CAP, "G06_ApresGeste_noted_structurelle_c3aa3bbdb_b35bdd6cb_1080x2400.png")

print(">>> CONTROLE NEGATIF — papier vierge (doit valoir ~1,0)")
mesure(G05, "papier vierge G05", 300, 450, 1230, 1300)
mesure(R7, "papier vierge cadre 7", 300, 450, 950, 1030)

print()
print(">>> SUR LE PAPIER DE LA CARTE (petits textes : plancher 4,5)")
mesure(R7, "ref c7  TACTIQUE", 122, 245, 893, 920)
mesure(G05, "cap G05 TACTIQUE", 168, 320, 1155, 1182)
mesure(R7, "ref c7  PORTEE", 150, 260, 1405, 1436)
mesure(G05, "cap G05 PORTEE", 138, 265, 1725, 1760)
mesure(R7, "ref c7  URGENCE", 495, 660, 1405, 1436)
mesure(G05, "cap G05 URGENCE", 520, 690, 1725, 1760)
mesure(R7, "ref c7  valeur 'moderee'", 134, 300, 1495, 1530)
mesure(G05, "cap G05 valeur 'majeure'", 134, 300, 1808, 1845)
mesure(G03, "cap G03 pastille DEJA TRANCHEE", 300, 530, 1915, 1945)

print()
print(">>> TITRE DE LA CARTE (grand texte : plancher 3,0)")
mesure(R7, "ref c7  titre ligne 1", 209, 586, 1075, 1125, seuil_grand=True)
mesure(G05, "cap G05 titre ligne 1", 238, 557, 1425, 1475, seuil_grand=True)

print()
print(">>> TITRE SOUS LE TAMPON — lisibilite de la partie NON couverte (vigilance 1)")
mesure(R6, "ref c6  titre sous tampon (bande)", 140, 660, 920, 1010, seuil_grand=True)
mesure(G01, "cap G01 titre sous tampon (bande)", 140, 660, 1300, 1390, seuil_grand=True)
mesure(G06, "cap G06 titre sous tampon (bande)", 140, 660, 1395, 1485, seuil_grand=True)

print()
print(">>> SUR LE VERT DU PANNEAU (encre CLAIRE)")
mesure(R6, "ref c6  grave VOUS AVEZ TRANCHE", 249, 817, 597, 630, encre_sombre=False, seuil_grand=True)
mesure(G01, "cap G01 grave VOUS AVEZ TRANCHE", 254, 822, 965, 998, encre_sombre=False, seuil_grand=True)
mesure(R6, "ref c6  RETOUR A L'ACCUEIL", 313, 764, 1707, 1733, encre_sombre=False)
mesure(G01, "cap G01 RETOUR A L'ACCUEIL", 321, 762, 2041, 2066, encre_sombre=False)
mesure(R6, "ref c6  sous-ligne grise", 277, 802, 1761, 1786, encre_sombre=False)
mesure(G01, "cap G01 sous-ligne grise", 277, 795, 2082, 2107, encre_sombre=False)
mesure(R6, "ref c6  LIBRE", 829, 929, 1328, 1349, encre_sombre=False)
mesure(G01, "cap G01 LIBRE", 810, 953, 1738, 1762, encre_sombre=False)
mesure(G06, "cap G06 PRIS", 810, 953, 1833, 1857, encre_sombre=False)
mesure(R6, "ref c6  'votre grande decision'", 770, 1000, 1372, 1420, encre_sombre=False)
mesure(G01, "cap G01 'votre grande decision'", 770, 1000, 1778, 1825, encre_sombre=False)

print()
print(">>> MOT-OR et mot ROUGE")
mesure(R6, "ref c6  mot-or (ligne 1)", 120, 960, 1490, 1540, encre_sombre=False, seuil_grand=True)
mesure(G01, "cap G01 mot-or (ligne 1)", 100, 980, 1840, 1890, encre_sombre=False, seuil_grand=True)
mesure(R7, "ref c7  'Rien n'est parti' rouge", 80, 1000, 1610, 1655, encre_sombre=False, seuil_grand=True)
mesure(G05, "cap G05 'Rien n'est parti' rouge", 100, 980, 1895, 1940, encre_sombre=False, seuil_grand=True)
