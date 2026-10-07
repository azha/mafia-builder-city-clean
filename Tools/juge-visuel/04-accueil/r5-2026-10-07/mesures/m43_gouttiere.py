# m43 — bord BAS du panneau et GOUTTIERE panneau -> plaque, au CENTRE (x 520..560), la seule
# colonne ou ni le decor ni un bouton ne se trouvent derriere.
# On descend depuis l'interieur du panneau et on releve les ruptures de couleur.
# CONTROLE POSITIF : la premiere rupture rencontree en montant depuis la plaque doit etre le
# liseré de la plaque, deja mesure en m23 (REF 1674 / 1920 1487 / 2400 1906).
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge


def med(v):
    v = sorted(v)
    return v[len(v) // 2]


DEP = {'REF': 1560, 'JEU1920': 1412, 'JEU2400': 1820}
FIN = {'REF': 1700, 'JEU1920': 1520, 'JEU2400': 1940}

for nom, p in [('REF', REF), ('JEU1920', J19), ('JEU2400', J24)]:
    im = charge(p)
    px = im.load()
    print('  --- %s, colonne x520..560 ---' % nom)
    prev = None
    for y in range(DEP[nom], FIN[nom]):
        c = tuple(med([px[x, y][k] for x in range(520, 560)]) for k in range(3))
        if prev is None or max(abs(c[i] - prev[i]) for i in range(3)) >= 3:
            print('    y=%d %s' % (y, c))
            prev = c
