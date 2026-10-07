# m38 — quelle TRANSFORMATION ferme l'ecart ? m37 montre que le manque est ~CONSTANT en unites
# sRGB (+3,4 a +4,3) du 5e au 10e decile, et NEGATIF (-2,5) au 1er decile. Un gain multiplicatif
# produit un manque qui CROIT avec le niveau : ce n'est pas la bonne forme.
# On compare donc trois familles, sur les memes paires :
#   A. gain sur la teinte (modele du r4)      L' = g*(L-PL)+PL      en lineaire
#   B. lift additif en sRGB                   C' = C + k            par canal
#   C. gain + plancher reduit                 L' = g*(L-PL)+f*PL
# Critere : erreur maximale sur les 10 deciles de la reference, ET non-brulure (canal max).
# CONTROLE POSITIF : k=0 / g=1 doit reproduire les rapports de m37.
# CONTROLE NEGATIF : k=30 doit faire exploser l'erreur du 1er decile.
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge
from m35_gain_par_tiers import srgb2lin, lin2srgb, PL


def paires(J, s, dx, dy, y0, y1, pas=4):
    ir = charge(REF)
    ij = charge(J)
    pxr = ir.load()
    pxj = ij.load()
    wr, hr = ir.size
    out = []
    for y in range(y0, y1, pas):
        for x in range(60, 1020, 4):
            X = int(s * x + dx)
            Y = int(s * y + dy)
            if 0 <= X < wr and 0 <= Y < hr:
                out.append((pxr[X, Y], pxj[x, y]))
    return out


def q(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(len(v) * p / 100))]


def evalue(P, bornes, transfo, nom):
    seaux = [[0.0, 0.0, 0] for _ in range(10)]
    mx = 0.0
    for a, b in P:
        la = lum(a)
        bb = transfo(b)
        lb = lum(bb)
        if max(bb) > mx:
            mx = max(bb)
        k = 9
        for i in range(10):
            if la < bornes[i + 1]:
                k = i
                break
        seaux[k][0] += la
        seaux[k][1] += lb
        seaux[k][2] += 1
    r = [(s[1] / s[0]) if s[2] else 1.0 for s in seaux]
    err = max(abs(v - 1) for v in r)
    print('  %-26s  ' % nom + ' '.join('%5.3f' % v for v in r) + '   err=%.3f  canal max=%.0f' % (err, mx))
    return err, r


if __name__ == '__main__':
    s, dx, dy = float(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
    y0, y1 = int(sys.argv[4]), int(sys.argv[5])
    P = paires(J19, s, dx, dy, y0, y1)
    A = [lum(a) for a, b in P]
    bornes = [q(A, k * 10) for k in range(11)]
    bornes[10] = 1e9
    print('  n=%d paires ; bornes de deciles REF : %s' % (len(P), ' '.join('%.1f' % v for v in bornes[:10])))
    print('  %-26s  ' % 'transformation' + ' '.join('  d%-2d' % (i + 1) for i in range(10)))
    evalue(P, bornes, lambda b: b, 'CONTROLE g=1 (livre)')

    def gain(g):
        return lambda b: tuple(lin2srgb(max(0.0, srgb2lin(b[k]) - PL) * g + PL) for k in range(3))

    def lift(k0):
        return lambda b: tuple(min(255.0, b[k] + k0) for k in range(3))

    def mixte(g, f):
        return lambda b: tuple(lin2srgb(max(0.0, srgb2lin(b[k]) - PL) * g + f * PL) for k in range(3))

    print('  --- A. gain sur la teinte seul ---')
    for g in (1.095, 1.15, 1.25, 1.30, 1.40):
        evalue(P, bornes, gain(g), 'A gain=%.3f (teinte %.3f)' % (g, 0.42 * g))
    print('  --- B. lift additif en sRGB seul ---')
    for k0 in (2, 3, 4, 5, 30):
        evalue(P, bornes, lift(k0), 'B lift=+%d/255' % k0)
    print('  --- C. gain + plancher reduit ---')
    for g, f in ((1.25, 0.6), (1.30, 0.5), (1.40, 0.4), (1.40, 0.2), (1.50, 0.0)):
        evalue(P, bornes, mixte(g, f), 'C gain=%.2f plancher x%.1f' % (g, f))
