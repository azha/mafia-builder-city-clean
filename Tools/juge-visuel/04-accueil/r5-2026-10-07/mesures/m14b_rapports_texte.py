# m14b — rapports JEU/REF des largeurs d'encre, sur les SEULES lignes dont le texte est
# strictement le meme des deux cotes (rangees 1 et 3 ; la rangee 2 ne se compare pas, elle
# se replie differemment). Fenetre bornee AVANT le bord gauche du bouton de la rangee
# (645 pour la rangee 1 : bouton or a 651 en ref, 678 en jeu ; 700 pour la rangee 3 : 705 / 729)
# — m14 coupait a 600/700 et rendait des largeurs egales a sa propre fenetre.
# Echelle horizontale 1:1 (1080 px des trois cotes) : les largeurs se comparent en px bruts.
# CONTROLE POSITIF : les deux resolutions du jeu doivent rendre le MEME rapport.
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge


def med(v):
    v = sorted(v)
    return v[len(v) // 2]


def larg(im, nom, lib, xg, xd, y0, y1, seuil=28):
    px = im.load()
    base = med([lum(px[x, y]) for y in range(y0, y1) for x in range(xg, xd)])
    pts = [x for y in range(y0, y1) for x in range(xg, xd) if lum(px[x, y]) - base > seuil]
    print('    %-8s %-14s x %d..%d largeur=%d' % (nom, lib, min(pts), max(pts), max(pts) - min(pts) + 1))
    return max(pts) - min(pts) + 1


ref = charge(REF)
j19 = charge(J19)
j24 = charge(J24)
print('ligne 1 — fenetre x<=645 (bouton or : 651 ref / 678 jeu)')
a = larg(ref, 'REF', 'titre1', 95, 645, 946, 978)
b = larg(j19, 'JEU1920', 'titre1', 90, 645, 868, 898)
c = larg(j24, 'JEU2400', 'titre1', 90, 645, 1274, 1305)
print('      titre1 jeu/ref 1920=%.3f  2400=%.3f' % (b / a, c / a))
a = larg(ref, 'REF', 'sous1', 95, 645, 1005, 1032)
b = larg(j19, 'JEU1920', 'sous1', 90, 645, 926, 954)
c = larg(j24, 'JEU2400', 'sous1', 90, 645, 1332, 1360)
print('      sous1  jeu/ref 1920=%.3f  2400=%.3f' % (b / a, c / a))
print('ligne 3 — fenetre x<=700 (bouton : 705 ref / 729 jeu)')
a = larg(ref, 'REF', 'titre3', 95, 700, 1374, 1406)
b = larg(j19, 'JEU1920', 'titre3', 90, 700, 1238, 1269)
c = larg(j24, 'JEU2400', 'titre3', 90, 700, 1645, 1675)
print('      titre3 jeu/ref 1920=%.3f  2400=%.3f' % (b / a, c / a))
a = larg(ref, 'REF', 'sous3', 95, 700, 1483, 1510)
b = larg(j19, 'JEU1920', 'sous3', 90, 700, 1340, 1367)
c = larg(j24, 'JEU2400', 'sous3', 90, 700, 1747, 1774)
print('      sous3  jeu/ref 1920=%.3f  2400=%.3f' % (b / a, c / a))
