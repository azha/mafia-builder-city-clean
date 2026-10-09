#!/usr/bin/env python3
"""M6 - CONTRASTE WCAG sur l'art reel, sur des textes suspects.
Methode : dans une fenetre qui ne contient QUE du texte et son fond, on prend
le 5e centile de luminance (= l'encre) et le 95e (= le fond), a >= 3 px des
bords de la fenetre, puis le rapport WCAG (L+0.05)/(l+0.05).
Seuils doctrine : >= 4,5:1 petits textes, >= 3:1 grands textes.

Controle POSITIF : un texte dont on SAIT qu'il est lisible (titre or sur fond
sombre) doit rendre >= 7:1.
Controle NEGATIF : si tout rend la meme valeur, l'instrument ne mesure rien.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])


def contraste(path, box, label):
    im = Image.open(path).convert('RGB')
    print(f'IMAGE {path.split("/")[-1]}  taille={im.size[0]}x{im.size[1]}')
    px = im.load()
    x0, y0, x1, y1 = box
    ls = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
    n = len(ls)
    enc, fond = ls[int(0.05 * n)], ls[int(0.95 * n)]
    hi, lo = max(enc, fond), min(enc, fond)
    r = (hi + 0.05) / (lo + 0.05)
    print(f'  {label:52s} encre L={enc:.4f} fond L={fond:.4f}  => {r:.2f}:1')
    return r


CAS = [
    # --- controle POSITIF : doit etre tres contraste ---
    (CAP + 'E01_Journal_1080x2400.png', (325, 560, 760, 625),
     '[CTRL+] E01 titre or "Le journal" sur plaque'),
    # --- E09 : textes sur le kraft ---
    (CAP + 'E09_Inspections_1080x2400.png', (245, 660, 835, 695),
     'E09 "DEPOSER UN SIGNALEMENT" (or sur kraft)'),
    (CAP + 'E09_Inspections_1080x2400.png', (345, 726, 745, 752),
     'E09 "SUR - Atelier Vesk" (gris sur kraft)'),
    (CAP + 'E09_Inspections_1080x2400.png', (280, 782, 800, 808),
     'E09 "EFFET - une entree de plus" (gris sur kraft)'),
    (CAP + 'E09_Inspections_1080x2400.png', (285, 942, 805, 966),
     'E09 "au bout de plusieurs..." (gris sur kraft)'),
    # --- E03 : libelles de la plaque creme ---
    (CAP + 'E03_Chanedappro_1080x2400.png', (100, 925, 335, 950),
     'E03 libelle "A QUOI CA SERT" (gris sur creme)'),
    (RC + 'ecran_appro/reference-1080x2102.png', (82, 775, 335, 800),
     '[REF] E03 libelle "A QUOI CA SERT" (gris sur creme)'),
    # --- E10 : la seule ligne du panneau vide ---
    (CAP + 'E10_Filire_1080x2400.png', (170, 1228, 905, 1258),
     'E10 "Votre planque... tient de quoi blanchir." (gris sur noir)'),
    # --- E02 : CTA eteint ---
    (CAP + 'E02_Carnet_1080x2400.png', (130, 1992, 480, 2024),
     'E02 CTA "Lancer la soiree" (mauve sur plaque)'),
    (CAP + 'E01_Journal_1080x2400.png', (325, 1950, 760, 1985),
     'E01 CTA "Y PRETER ATTENTION" (gris sur plaque)'),
    # --- E08 : sous-titre sur le voile ---
    (CAP + 'E08_Lasemaine_1080x2400.png', (255, 955, 825, 985),
     'E08 "TENSION CALME - AUCUNE SEMAINE" (gris sur voile)'),
]

for p, b, l in CAS:
    contraste(p, b, l)
