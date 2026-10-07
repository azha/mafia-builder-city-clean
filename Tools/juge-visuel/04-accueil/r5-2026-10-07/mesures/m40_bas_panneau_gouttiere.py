# m40 — bas du panneau LA SUITE et GOUTTIERE panneau -> plaque TRANCHER.
# Le liseré du panneau (31,37,46 ref / 34,38,46 jeu) et celui de la plaque (41,53,71 / 42,53,71)
# sont DIFFERENTS : un detecteur regle sur l'un attrape l'autre si la tolerance est trop large
# (c'est ce qui a fausse m33). On les separe ici par leur plus proche voisin.
# CONTROLE POSITIF : la largeur des deux boites doit etre la meme (988 ref / 986 jeu, m5).
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge

PAN = {'REF': (31, 37, 46), 'JEU1920': (34, 38, 46), 'JEU2400': (34, 38, 46)}
PLQ = {'REF': (41, 53, 71), 'JEU1920': (42, 53, 71), 'JEU2400': (42, 53, 71)}
XG = {'REF': (46, 50), 'JEU1920': (47, 51), 'JEU2400': (47, 51)}
XD = {'REF': (1030, 1035), 'JEU1920': (1029, 1034), 'JEU2400': (1029, 1034)}
ZONE = {'REF': (820, 1900), 'JEU1920': (740, 1700), 'JEU2400': (1150, 2150)}


def d2(p, c):
    return sum((p[i] - c[i]) ** 2 for i in range(3))


def classe(p, nom, tol=130):
    dp = d2(p, PAN[nom])
    dq = d2(p, PLQ[nom])
    if min(dp, dq) > tol:
        return None
    return 'P' if dp <= dq else 'Q'


def scan(im, nom):
    px = im.load()
    y0, y1 = ZONE[nom]
    lig = []
    for y in range(y0, y1):
        g = [classe(px[x, y], nom) for x in range(*XG[nom])]
        d = [classe(px[x, y], nom) for x in range(*XD[nom])]
        for k in ('P', 'Q'):
            if k in g and k in d:
                lig.append((y, k))
                break
    blocs = []
    cur = None
    for y, k in lig:
        if cur and cur[2] == k and y - cur[1] <= 3:
            cur[1] = y
        else:
            if cur:
                blocs.append(cur)
            cur = [y, y, k]
    if cur:
        blocs.append(cur)
    print('  --- %s ---' % nom)
    out = {}
    for a, b, k in blocs:
        if b - a < 30:
            continue
        lib = 'PANNEAU' if k == 'P' else 'PLAQUE '
        print('    %s cotes droits y %d..%d (%d lignes)' % (lib, a, b, b - a + 1))
        out.setdefault(k, []).append((a, b))
    return out


R = {}
for n, p in [('REF', REF), ('JEU1920', J19), ('JEU2400', J24)]:
    R[n] = scan(charge(p), n)

print()
print('  rayon des coins = (bord exterieur - debut des cotes droits) ; on le prend sur la PLAQUE')
print('  GOUTTIERE = debut des cotes droits de la plaque - fin des cotes droits du panneau')
print('              + (rayon bas du panneau) + (rayon haut de la plaque) -> on donne les DEUX lectures')
for n in R:
    p = R[n].get('P', [])
    q = R[n].get('Q', [])
    if not p or not q:
        print('  %s : classes manquantes %s' % (n, list(R[n])))
        continue
    pb = p[0][1]
    qa = q[0][0]
    print('  %-8s cotes droits : panneau finit y=%d, plaque commence y=%d  -> ecart brut = %d px'
          % (n, pb, qa, qa - pb))
