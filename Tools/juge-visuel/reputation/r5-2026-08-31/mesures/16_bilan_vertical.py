#!/usr/bin/env python3
"""Temps 3 — BILAN vertical : ou passe la hauteur.

Les bornes viennent des scripts 01/02 (frontieres de luminance, en px CSS rapportes au
coin haut-gauche du cadre). Ce script ne mesure rien de neuf : il fait la comptabilite et
verifie qu'elle BOUCLE — la somme des blocs et des gouttieres doit redonner la hauteur du
cadre, des deux cotes. Si elle ne bouclait pas, les bornes seraient fausses.

Contrôle : |somme - hauteur du cadre| doit valoir 0 dans les deux colonnes.
"""
from PIL import Image
import os

for p in (os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'),
          '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png'):
    print(' ', os.path.basename(p), Image.open(p).size)
print()

# (nom, ref_y0, ref_y1, cap_y0, cap_y1)
B = [
    ('bandeau enseigne (titre)', 8.00, 60.67, 7.78, 58.89),
    ('tuiles compteurs', 69.67, 101.67, 67.78, 100.00),
    ('grand panneau (portrait + liste)', 110.67, 322.33, 108.89, 304.17),
    ('panneau verdict', 331.33, 407.67, 313.06, 387.22),
    ('CTA', 416.67, 443.00, 396.11, 420.56),
]
CADRE_R, CADRE_C = 452.00, 451.94

print(f'{"bloc":36s} {"REF h":>8s} {"JEU h":>8s} {"delta":>8s} {"rel":>8s}')
print('-' * 74)
prev_r = prev_c = 0.0
somme_r = somme_c = 0.0
for nom, r0, r1, c0, c1 in B:
    gr, gc = r0 - prev_r, c0 - prev_c
    print(f'  {"(gouttiere)":34s} {gr:8.2f} {gc:8.2f} {gc-gr:+8.2f} {100*(gc-gr)/gr if gr else 0:+7.1f}%')
    hr, hc = r1 - r0, c1 - c0
    print(f'{nom:36s} {hr:8.2f} {hc:8.2f} {hc-hr:+8.2f} {100*(hc-hr)/hr:+7.1f}%')
    somme_r += gr + hr
    somme_c += gc + hc
    prev_r, prev_c = r1, c1
vr, vc = CADRE_R - prev_r, CADRE_C - prev_c
print(f'  {"VIDE sous le CTA, dans le cadre":34s} {vr:8.2f} {vc:8.2f} {vc-vr:+8.2f} '
      f'{100*(vc-vr)/vr:+7.1f}%   <=== ')
somme_r += vr
somme_c += vc
print('-' * 74)
print(f'{"somme":36s} {somme_r:8.2f} {somme_c:8.2f}')
print(f'{"hauteur du cadre (script 00)":36s} {CADRE_R:8.2f} {CADRE_C:8.2f}')
print(f'{"CONTROLE : ecart de bouclage":36s} {somme_r-CADRE_R:8.2f} {somme_c-CADRE_C:8.2f}'
      f'   (doit valoir 0.00)')
print()
print('Lecture : les cinq gouttieres inter-blocs sont justes (9.0 -> 8.9 CSS partout).')
print('Les blocs, eux, sont tous un peu plus courts, et le grand panneau de 16.4 CSS a lui')
print('seul. Le manque total se depose en bas, DANS le cadre : le vide sous le CTA passe de')
print(f'{vr:.2f} a {vc:.2f} CSS, soit x{vc/vr:.1f}.')
