# -*- coding: utf-8 -*-
"""㉚ : un FILET POINTILLÉ est une ligne qui alterne régulièrement clair/sombre sur toute la
largeur du bon. Détecteur : ≥ 40 transitions sur la bande, et ≥ 80 % de la largeur couverte.
Contrôle positif : la référence DOIT en rendre 4 (le canon pose .l{border-top:1px dotted} sur
4 lignes). Contrôle négatif : une ligne de texte ne doit PAS passer (peu de transitions, encre
groupée)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
print('IMAGES')
ref = ouvrir(os.path.join(JV, 'ecran_appro/r-groupe-2026-10-07/ref/cadre-48.png'))
c19 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E03_Chanedappro_1080x1920.png'))

def filets(im, x0, x1, y0, y1, seuil_lum, nom):
    trouves = []
    for y in range(y0, y1):
        px = list(im.crop((x0, y, x1, y + 1)).getdata())
        d = [1 if (0.299*p[0]+0.587*p[1]+0.114*p[2]) < seuil_lum else 0 for p in px]
        tr = sum(1 for i in range(1, len(d)) if d[i] != d[i-1])
        idx = [i for i, v in enumerate(d) if v]
        if not idx: continue
        couv = (idx[-1] - idx[0] + 1) / (x1 - x0)
        if tr >= 40 and couv >= 0.80 and 0.30 < sum(d)/len(d) < 0.70:
            trouves.append((y, tr, round(couv, 2)))
    # regroupe les y contigus
    grp, cur = [], None
    for y, tr, c in trouves:
        if cur and y == cur[1] + 1: cur[1] = y
        else:
            if cur: grp.append(tuple(cur))
            cur = [y, y]
    if cur: grp.append(tuple(cur))
    print('   %-7s %d filet(s) pointillé(s) : %s' % (nom, len(grp), grp))
    return grp

print('\n(seuil de luminance : papier − 25)')
print('  CONTRÔLE POSITIF — référence, bon de commande y 690..1160 :')
filets(ref, 120, 950, 690, 1160, 0.299*0xef+0.587*0xe7+0.114*0xd6 - 25, 'réf')
print('  JEU 1080x1920, bon de commande y 620..1060 :')
filets(c19, 120, 950, 620, 1060, 0.299*0xea+0.587*0xe0+0.114*0xc8 - 25, 'jeu19')
print('  CONTRÔLE NÉGATIF — une ligne de TEXTE de la référence (y 845..860) ne doit pas sortir :')
filets(ref, 120, 950, 845, 862, 0.299*0xef+0.587*0xe7+0.114*0xd6 - 25, 'réf-txt')
