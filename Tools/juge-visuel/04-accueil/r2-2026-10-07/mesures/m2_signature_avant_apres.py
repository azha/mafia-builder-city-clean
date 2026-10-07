#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""r2 ④ — v2 des sondes AVANT/APRÈS, après que m1 ait montré que deux de ses trois fenêtres
étaient MAL VISÉES (S1 contaminée par le médaillon au centre ; S3 à cheval sur le bord de la
pilule : delta exactement +0.00 sur deux images différentes — la signature d'une fenêtre posée sur
un aplat, pas d'une mesure).

Deux sondes seulement, mais chacune AUTO-LOCALISÉE (plus de fenêtre devinée) et chacune avec son
contrôle négatif.

  T1  ENCRE CYAN de la gravité (« LÉGÈRE »). Compte, dans toute la moitié basse de l'image, les
      pixels dont B-R > 60 ET B > 110 (le cyan saturé du jeton d'alarme). Le lot ④ groupe A
      (F17, dossier.md) remplace ce cyan par un gris chaud.
         AVANT -> compte >> 0      APRÈS -> compte == 0
      Contrôle NÉGATIF = la référence courante, dont je sais qu'elle est en gris chaud : elle DOIT
      rendre 0. Contrôle POSITIF = le même balayage sur la bande du médaillon (arc teal du
      manomètre), qui DOIT rendre > 0 sur toutes les images — sinon le motif ne sait pas voir du
      cyan et son 0 ne prouverait rien.

  T2  BANDE PLATE sous le filet, mesurée HORS médaillon (x 0..300 et x 780..1080 seulement, le
      médaillon et le losange vivent au centre). Un aplat rend un écart-type ~0 sur chaque ligne.
"""
import os
from PIL import Image

RACINE = os.path.dirname(os.path.abspath(__file__))
R1 = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r1-2026-09-26'
CLICHE = '/home/erutheone/project/mafia-unity-F/Logs/cliche-parcours'
REF = os.path.abspath(os.path.join(RACINE, '..', 'reference'))

IMAGES = [
    ('capture r1 1920', os.path.join(R1, 'captures', 'p1_lancement_1080x1920.png')),
    ('capture r1 2400', os.path.join(R1, 'captures', 'p1_lancement_1080x2400.png')),
    ('capture 072418 1920', os.path.join(CLICHE, '20260926-072418', 'p1_lancement_1080x1920.png')),
    ('capture 072418 2400', os.path.join(CLICHE, '20260926-072418', 'p1_lancement_1080x2400.png')),
    ('REF cadre4 (r2)', os.path.join(REF, 'cadre-4-la-suite.png')),
    ('REF cadre4 (r1)', os.path.join(R1, 'reference', 'cadre-4-la-suite.png')),
]


def ouvrir(ch):
    im = Image.open(ch).convert('RGB')
    print('   ouvre %-30s %dx%d' % (os.path.basename(ch), im.size[0], im.size[1]))
    return im


def compte_cyan(im, y0, y1):
    px = im.load()
    w, h = im.size
    n = 0
    for y in range(max(0, y0), min(y1, h)):
        for x in range(w):
            r, g, b = px[x, y]
            if b - r > 60 and b > 110:
                n += 1
    return n


def ecart_type(v):
    n = len(v)
    if n < 2:
        return 0.0
    m = sum(v) / n
    return (sum((x - m) ** 2 for x in v) / (n - 1)) ** 0.5


def bande_hors_medaillon(im, y0, y1):
    px = im.load()
    h = im.size[1]
    xs = list(range(0, 300, 3)) + list(range(780, 1080, 3))
    ecarts, moys = [], []
    for y in range(max(0, y0), min(y1, h)):
        lum = [0.2126 * px[x, y][0] + 0.7152 * px[x, y][1] + 0.0722 * px[x, y][2] for x in xs]
        ecarts.append(ecart_type(lum))
        moys.append(sum(lum) / len(lum))
    ecarts.sort(); moys.sort()
    return ecarts[len(ecarts) // 2], moys[len(moys) // 2]


def main():
    print('=== images lues ===')
    ims = []
    for nom, ch in IMAGES:
        if not os.path.exists(ch):
            print('   ABSENT  %s' % ch); continue
        ims.append((nom, ouvrir(ch), ch))

    print('\n=== T1-controle POSITIF : cyan dans la bande du manometre (y 40..200) ===')
    print('    doit etre > 0 PARTOUT, sinon le motif ne sait pas voir du cyan')
    for nom, im, _ in ims:
        print('   %-22s cyan=%6d  %s' % (nom, compte_cyan(im, 40, 200),
                                         'OK' if compte_cyan(im, 40, 200) > 0 else 'KO motif aveugle'))

    print('\n=== T1 : cyan sature dans la MOITIE BASSE (jeton de gravite) ===')
    print('    AVANT (F17 non applique) -> > 0 ; APRES -> 0 ; REF courante = controle NEGATIF')
    for nom, im, _ in ims:
        h = im.size[1]
        n = compte_cyan(im, h // 2, h)
        print('   %-22s cyan=%6d  -> %s' % (nom, n, 'AVANT (cyan present)' if n > 0 else 'APRES / gris chaud'))

    print('\n=== T2 : bande sous le filet, HORS medaillon (y 150..230, x<300 et x>780) ===')
    print('    un APLAT -> ecart-type ~0')
    for nom, im, _ in ims:
        e, m = bande_hors_medaillon(im, 150, 230)
        print('   %-22s ecart-type=%7.2f  luminance=%6.2f  -> %s'
              % (nom, e, m, 'BANDE PLATE' if e < 3.0 else 'de l art'))


if __name__ == '__main__':
    main()
