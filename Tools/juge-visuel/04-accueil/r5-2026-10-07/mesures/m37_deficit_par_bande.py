# m37 — le deficit de tons moyens est-il UNIFORME, ou a-t-il une forme ?
# Deux questions distinctes, parce qu'elles designent deux causes differentes :
#   (a) par BANDE VERTICALE  -> si le deficit varie avec y, ce n'est pas un gain, c'est le VOILE
#       en degrade (la maquette pose `voile-scene` #0a0f18cc -> 22/18 % -> 00 a 40 % -> 66) ;
#   (b) par NIVEAU de la reference (deciles) -> la forme de la courbe de transfert.
# CONTROLE POSITIF : la somme des effectifs des bandes doit egaler n.
# CONTROLE NEGATIF : un decile ou REF et JEU sont egaux doit sortir un rapport ~1.
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge


def paires_xy(J, s, dx, dy, y0, y1, pas=3):
    ir = charge(REF)
    ij = charge(J)
    pxr = ir.load()
    pxj = ij.load()
    wr, hr = ir.size
    out = []
    for y in range(y0, y1, pas):
        for x in range(60, 1020, 3):
            X = int(s * x + dx)
            Y = int(s * y + dy)
            if 0 <= X < wr and 0 <= Y < hr:
                out.append((y, lum(pxr[X, Y]), lum(pxj[x, y])))
    return out


def q(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(len(v) * p / 100))]


if __name__ == '__main__':
    s, dx, dy = float(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
    y0, y1 = int(sys.argv[4]), int(sys.argv[5])
    P = paires_xy(J19, s, dx, dy, y0, y1)
    n = len(P)
    print('  n=%d paires, recalage REF = %.4f*JEU + (%d,%d)' % (n, s, dx, dy))
    print()
    print('  (a) par BANDE VERTICALE de la capture (8 bandes egales)')
    pas = (y1 - y0) / 8.0
    tot = 0
    for i in range(8):
        a = y0 + i * pas
        b = a + pas
        sel = [p for p in P if a <= p[0] < b]
        tot += len(sel)
        if not sel:
            continue
        mr = sum(p[1] for p in sel) / len(sel)
        mj = sum(p[2] for p in sel) / len(sel)
        print('    y %4d..%4d  n=%6d   REF %6.2f  JEU %6.2f  JEU/REF %.3f' % (a, b, len(sel), mr, mj, mj / mr))
    print('    CONTROLE effectifs : %d bandes = %d, n = %d  (%s)' % (8, tot, n, 'EGAL' if tot == n else 'ECART'))
    print()
    print('  (b) par DECILE de la luminance de la REFERENCE')
    bornes = [q([p[1] for p in P], k * 10) for k in range(0, 11)]
    for k in range(10):
        a, b = bornes[k], bornes[k + 1]
        sel = [p for p in P if (a <= p[1] < b) or (k == 9 and p[1] >= a)]
        if not sel:
            continue
        mr = sum(p[1] for p in sel) / len(sel)
        mj = sum(p[2] for p in sel) / len(sel)
        print('    d%-2d REF %6.2f..%6.2f  n=%6d   REF %6.2f  JEU %6.2f  JEU/REF %.3f  manque %+6.2f'
              % (k + 1, a, b, len(sel), mr, mj, mj / mr, mr - mj))
