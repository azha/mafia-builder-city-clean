#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""M2 — la « bande sombre » sous la barre haute : existe-t-elle, et combien de px ?

Méthode : pour chaque ligne y, la MÉDIANE de la luminance sur les colonnes 8..340 et 740..1072
(les deux bords, ce qui exclut le médaillon central ET le texte ARGENT / JOUR, cantonnés au
premier tiers haut). Une bande sombre est une plage de lignes consécutives dont la médiane reste
sous un seuil, ENTRE la barre haute et le premier contenu clair.

⚠️ Le seuil n'est pas choisi : il est DÉRIVÉ. On prend le maximum des médianes de la plage
[y_ligne_or+4 .. y_ligne_or+40] (le cœur de la bande) et on descend tant que la médiane reste
≤ ce maximum + 2. La borne basse est donc lue sur la courbe, pas décidée.

Contrôle positif : la ligne or de la barre haute doit sortir comme un PIC isolé (médiane >> voisins).
Contrôle négatif : la même procédure appliquée à la RÉFÉRENCE doit rendre une bande de longueur
nulle ou quasi nulle — si elle rend la même bande, l'instrument mesure autre chose.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
CIBLES = [
    ('REF cadre 4', '../reference/cadre-4-la-suite.png'),
    ('REF cadre 0', '../reference/cadre-0-rien-a-trancher.png'),
    ('JEU 1080x1920', '../captures/p1_lancement_1080x1920.png'),
    ('JEU 1080x2400', '../captures/p1_lancement_1080x2400.png'),
]
BANDES_X = list(range(8, 340)) + list(range(740, 1072))


def med_ligne(px, w, y):
    v = sorted(px[x, y] for x in BANDES_X)
    return v[len(v) // 2]


def main():
    for nom, rel in CIBLES:
        p = os.path.join(ICI, rel)
        im = Image.open(p).convert('L')
        w, h = im.size
        px = im.load()
        prof = [med_ligne(px, w, y) for y in range(0, 420)]
        print('\n=== %s — %s — %dx%d — colonnes echantillonnees : %d ===' %
              (nom, os.path.basename(p), w, h, len(BANDES_X)))
        # pic de la ligne or : la ligne dont la mediane depasse le plus ses voisines a +-6 px
        pic, ypic = -1, None
        for y in range(20, 320):
            d = prof[y] - max(prof[y - 6], prof[y + 6])
            if d > pic:
                pic, ypic = d, y
        print('  pic de ligne (barre haute) : y=%d  mediane=%d  ecart aux voisins=+%d'
              % (ypic, prof[ypic], pic))
        if pic < 8:
            print('  -> AUCUN pic net : pas de filet horizontal sur cette image')
        coeur = max(prof[ypic + 4: ypic + 41])
        seuil = coeur + 2
        y = ypic + 4
        while y < 419 and prof[y] <= seuil:
            y += 1
        print('  coeur de bande (max des medianes y=%d..%d) = %d  -> seuil derive = %d'
              % (ypic + 4, ypic + 40, coeur, seuil))
        print('  bande sombre : y=%d .. %d  soit %d px  (%.1f %% de la hauteur)'
              % (ypic + 1, y - 1, y - 1 - ypic, 100.0 * (y - 1 - ypic) / h))
        print('  mediane juste apres la bande (y=%d..%d) : %s'
              % (y, y + 20, [prof[k] for k in range(y, min(y + 21, 420), 4)]))


if __name__ == '__main__':
    main()
