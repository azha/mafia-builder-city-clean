# m45 — section 5 du mandat : rien de coupe, rien hors cadre, pas de bande nue en bas.
# On releve le bas de chaque objet, la marge restante sous le dernier, et la couleur des
# dernieres lignes de l'ecran (une bande nue se verrait comme une couleur etrangere).
# Les bornes verticales viennent de m43 (panneau, plaque) et m27 (bas des libelles du dock).
# CONTROLE POSITIF : la reference aussi doit passer (elle a 52 px de marge basse).
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge


def med(v):
    v = sorted(v)
    return v[len(v) // 2]


OBJ = {
    'REF': dict(panneau=(825, 1636), plaque=(1674, 1825), dock_lib_bas=2049, H=2102),
    'JEU1920': dict(panneau=(754, 1450), plaque=(1487, 1635), dock_lib_bas=1861, H=1920),
    'JEU2400': dict(panneau=(1162, 1857), plaque=(1906, 2103), dock_lib_bas=2341, H=2400),
}

for n, p in [('REF', REF), ('JEU1920', J19), ('JEU2400', J24)]:
    im = charge(p)
    px = im.load()
    o = OBJ[n]
    H = o['H']
    print('  --- %s (hauteur %d) ---' % (n, H))
    print('    panneau %s  plaque %s  bas des libelles du dock %d  marge basse=%d'
          % (o['panneau'], o['plaque'], o['dock_lib_bas'], H - 1 - o['dock_lib_bas']))
    for y in (H - 40, H - 20, H - 6, H - 1):
        print('      y=%d couleur mediane sur x200..880 : %s'
              % (y, tuple(med([px[x, y][k] for x in range(200, 880, 4)]) for k in range(3))))
