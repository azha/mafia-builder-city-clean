# m36 — suite de m35. m35 montre que l'ecart n'a PAS la forme d'un gain : les ombres du jeu sont
# DEJA +3,4 % au-dessus de la reference, les tons moyens -14,0 %, les hauts -11,5 %. Un gain
# multiplie aussi l'exces des ombres. On balaie donc les DEUX parametres du modele livre :
#     L' = g * (L_jeu - PL) + f * PL        (g = gain sur la teinte, f = facteur du plancher)
# et on cherche le couple qui minimise l'erreur MAXIMALE sur les trois tiers.
# CONTROLE POSITIF : (g=1, f=1) doit reproduire exactement les rapports de m35.
# CONTROLE NEGATIF : (g=3, f=1) doit sortir une erreur enorme.
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge
from m35_gain_par_tiers import srgb2lin, lin2srgb, PL, paires, q, tiers


def rapports(P, t1, t2, g, f):
    gr = {'BAS': [0.0, 0.0, 0], 'MOY': [0.0, 0.0, 0], 'HAUT': [0.0, 0.0, 0]}
    mx = 0.0
    p99A = []
    p99B = []
    for a, b in P:
        la = lum(a)
        if g == 1.0 and f == 1.0:
            bb = b
        else:
            bb = tuple(lin2srgb(max(0.0, srgb2lin(b[k]) - PL) * g + f * PL) for k in range(3))
        lb = lum(bb)
        k = 'BAS' if la < t1 else ('MOY' if la < t2 else 'HAUT')
        gr[k][0] += la
        gr[k][1] += lb
        gr[k][2] += 1
        if max(bb) > mx:
            mx = max(bb)
        p99A.append(la)
        p99B.append(lb)
    r = {k: gr[k][1] / gr[k][0] for k in gr}
    r['p99'] = q(p99B, 99) / q(p99A, 99)
    r['max'] = mx
    return r


if __name__ == '__main__':
    s, dx, dy = float(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
    J = J19 if sys.argv[4] == '1920' else J24
    y0, y1 = int(sys.argv[5]), int(sys.argv[6])
    P = paires(J, s, dx, dy, y0, y1, pas=5)
    t1, t2 = tiers(P)
    print('  n=%d paires (pas=5) ; t1=%.2f t2=%.2f' % (len(P), t1, t2))
    print('  CONTROLE POSITIF  (g=1,f=1) :', {k: round(v, 3) for k, v in rapports(P, t1, t2, 1.0, 1.0).items()})
    print('  CONTROLE NEGATIF  (g=3,f=1) :', {k: round(v, 3) for k, v in rapports(P, t1, t2, 3.0, 1.0).items()})
    print()
    print('  %-6s %-6s %7s %7s %7s %7s  %s' % ('gain', 'planch', 'BAS', 'MOY', 'HAUT', 'p99', 'erreur max'))
    best = None
    for gi in range(0, 13):
        g = 1.0 + gi * 0.05
        for fi in range(0, 7):
            f = 0.4 + fi * 0.1
            r = rapports(P, t1, t2, g, f)
            e = max(abs(r['BAS'] - 1), abs(r['MOY'] - 1), abs(r['HAUT'] - 1))
            if best is None or e < best[0]:
                best = (e, g, f, r)
            if fi == 0 or abs(g - 1.0) < 1e-9 or e < 0.07:
                print('  %-6.2f %-6.2f %7.3f %7.3f %7.3f %7.3f  %.3f'
                      % (g, f, r['BAS'], r['MOY'], r['HAUT'], r['p99'], e))
    e, g, f, r = best
    print()
    print('  MEILLEUR COUPLE : gain=%.2f  plancher x%.2f  -> BAS %.3f  MOY %.3f  HAUT %.3f  p99 %.3f  (erreur max %.3f)'
          % (g, f, r['BAS'], r['MOY'], r['HAUT'], r['p99'], e))
    print('  canal le plus clair apres correction : %.1f/255 (brulure si proche de 255)' % r['max'])
