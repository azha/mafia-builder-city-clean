# m42 — rayon du coin HAUT-GAUCHE du panneau LA SUITE, v2.
# m41 echouait sur le panneau : a gauche du panneau il y a le DECOR (bruite), pas un fond plat,
# donc « premier pixel plus clair que le fond » attrapait un toit. On cherche ici le LISERE par
# sa COULEUR ((31,37,46) ref / (34,38,46) jeu, mesurees en m5), pas par un contraste.
# CONTROLE POSITIF : a mi-hauteur du panneau le liseré doit etre trouve a x=46 (ref) / 47 (jeu).
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge

BORD = {'REF': (31, 37, 46), 'JEU1920': (34, 38, 46), 'JEU2400': (34, 38, 46)}
TOP = {'REF': 825, 'JEU1920': 754, 'JEU2400': 1162}
MID = {'REF': 1290, 'JEU1920': 1180, 'JEU2400': 1660}


def premier_liseré(px, y, nom, tol=9, x0=30, x1=260):
    b = BORD[nom]
    for x in range(x0, x1):
        if max(abs(px[x, y][i] - b[i]) for i in range(3)) <= tol:
            return x
    return None


for nom, p in [('REF', REF), ('JEU1920', J19), ('JEU2400', J24)]:
    im = charge(p)
    px = im.load()
    ctrl = premier_liseré(px, MID[nom], nom)
    print('  --- %s --- CONTROLE POSITIF a mi-hauteur y=%d : liseré a x=%s' % (nom, MID[nom], ctrl))
    vals = []
    for k in range(0, 80):
        vals.append((k, premier_liseré(px, TOP[nom] + k, nom)))
    print('    ' + '  '.join('%d:%s' % (k, g) for k, g in vals if k < 10 or k % 5 == 0))
    atteint = next((k for k, g in vals if g is not None and ctrl is not None and g <= ctrl + 1), None)
    print('    bord gauche definitif (x=%s) atteint a k=%s  => RAYON du coin ~= %s px' % (ctrl, atteint, atteint))
