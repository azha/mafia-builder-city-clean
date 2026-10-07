# m44 — la gravite (« LEGERE ») et la ligne « Lt. X attend vos ordres » : hauteur de CAPITALE
# (profil de lignes sur la 1re lettre, qui n'a pas d'accent) et largeur d'encre du mot entier.
# « LEGERE » est le meme mot des deux cotes : sa largeur est directement comparable (echelle 1:1).
# CONTROLE POSITIF : la couleur de l'encre doit valoir le jeton #8c8272 des deux cotes (m25).
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge


def med(v):
    v = sorted(v)
    return v[len(v) // 2]


def profil(im, nom, lib, xg, xd, y0, y1, seuil=22):
    px = im.load()
    base = med([lum(px[x, y]) for y in range(y0, y1) for x in range(xg, xd)])
    s = ''
    for y in range(y0, y1):
        n = sum(1 for x in range(xg, xd) if lum(px[x, y]) - base > seuil)
        s += '#' if n > 0 else '.'
    i = s.find('#')
    j = s.find('.', i) if i >= 0 else -1
    print('    %-8s %-14s y%d..%d  %s  -> bloc y %d..%d  h=%s'
          % (nom, lib, y0, y1, s, y0 + i, y0 + j - 1, (j - i) if j > 0 else '?'))


def largeur(im, nom, lib, xg, xd, y0, y1, seuil=22):
    px = im.load()
    base = med([lum(px[x, y]) for y in range(y0, y1) for x in range(xg, xd)])
    xs = [x for y in range(y0, y1) for x in range(xg, xd) if lum(px[x, y]) - base > seuil]
    print('    %-8s %-14s encre x %d..%d  largeur=%d' % (nom, lib, min(xs), max(xs), max(xs) - min(xs) + 1))
    return max(xs) - min(xs) + 1


ref = charge(REF)
j19 = charge(J19)
j24 = charge(J24)
print('  « LEGERE » — hauteur de capitale sur le L (pas d accent)')
profil(ref, 'REF', 'L de LEGERE', 88, 106, 1752, 1795)
profil(j19, 'JEU1920', 'L de LEGERE', 79, 92, 1568, 1600)
profil(j24, 'JEU2400', 'L de LEGERE', 79, 92, 2011, 2043)
print('  « LEGERE » — largeur du mot entier (meme mot des deux cotes)')
a = largeur(ref, 'REF', 'LEGERE', 80, 260, 1755, 1790)
b = largeur(j19, 'JEU1920', 'LEGERE', 70, 260, 1570, 1595)
c = largeur(j24, 'JEU2400', 'LEGERE', 70, 260, 2013, 2038)
print('    rapport JEU/REF : 1920=%.3f  2400=%.3f' % (b / a, c / a))
print('  « Lt. ... attend vos ordres » — hauteur de capitale sur le L')
profil(ref, 'REF', 'L de Lt.', 88, 104, 1706, 1748)
profil(j19, 'JEU1920', 'L de Lt.', 79, 95, 1528, 1570)
profil(j24, 'JEU2400', 'L de Lt.', 79, 95, 1971, 2013)
print('  « TRANCHER » — largeur et capitale (meme mot des deux cotes)')
a = largeur(ref, 'REF', 'TRANCHER', 700, 1020, 1730, 1765)
b = largeur(j19, 'JEU1920', 'TRANCHER', 700, 1020, 1545, 1578)
c = largeur(j24, 'JEU2400', 'TRANCHER', 700, 1020, 1988, 2021)
print('    rapport JEU/REF : 1920=%.3f  2400=%.3f' % (b / a, c / a))
