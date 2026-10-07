# m41 — RAYON des coins du panneau LA SUITE et de la plaque TRANCHER.
# m40 a montre que les cotes droits du panneau commencent 53 px sous le bord haut dans la REF et
# 10 px seulement dans le jeu : ce serait un rayon tres different. On le mesure directement, en
# relevant le bord GAUCHE de la boite ligne par ligne depuis son bord haut.
# rayon = nombre de lignes qu'il faut descendre pour que le bord gauche atteigne sa valeur droite.
# CONTROLE POSITIF : loin des coins, le bord gauche doit etre constant (46 ref / 47 jeu, m5).
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge


def bord_gauche(px, y, x0=20, x1=200):
    """premier x (depuis la gauche) dont la luminance depasse nettement le fond local"""
    base = min(lum(px[x, y]) for x in range(x0, x0 + 12))
    for x in range(x0, x1):
        if lum(px[x, y]) - base > 8:
            return x
    return None


def corner(im, nom, ytop, n=70, lib='panneau'):
    px = im.load()
    print('  --- %s / %s : bord gauche, y = bord haut + k ---' % (nom, lib))
    vals = []
    for k in range(0, n):
        y = ytop + k
        g = bord_gauche(px, y)
        vals.append((k, g))
    print('    ' + '  '.join('%d:%s' % (k, g) for k, g in vals if k % 4 == 0 or k < 8))
    stable = [g for k, g in vals if g is not None]
    if stable:
        xmin = min(stable)
        prem = next((k for k, g in vals if g is not None and g <= xmin + 1), None)
        print('    bord gauche stable x=%s atteint a k=%s  => RAYON ~= %s px' % (xmin, prem, prem))


ref = charge(REF)
j19 = charge(J19)
j24 = charge(J24)
corner(ref, 'REF', 825, 70, 'panneau')
corner(j19, 'JEU1920', 753, 70, 'panneau')
corner(j24, 'JEU2400', 1161, 70, 'panneau')
corner(ref, 'REF', 1674, 50, 'plaque')
corner(j19, 'JEU1920', 1487, 50, 'plaque')
corner(j24, 'JEU2400', 1906, 50, 'plaque')
