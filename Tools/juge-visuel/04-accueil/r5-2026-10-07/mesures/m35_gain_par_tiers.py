# m35 — LE POINT A TRANCHER, repose correctement : l'ecart se mesure sur les pixels APPARIES
# (meme point du tableau des deux cotes), tiers par tiers, et la simulation du gain se lit sur
# LES MEMES tiers — pas sur les percentiles de deux distributions separees (qui ne comparent
# pas les memes pixels et donnent une reponse differente).
#
# Modele simule : le decor livre vaut, en LINEAIRE,   L_jeu = teinte * L_art + plancher
# avec plancher = lin(5/255) ; un gain g sur la TEINTE donne  L' = g*(L_jeu - plancher) + plancher.
#
# CONTROLE POSITIF : a g=1 la simulation doit rendre exactement les rapports mesures.
# CONTROLE NEGATIF : a g=3 les hautes lumieres doivent decrocher nettement (sinon la simulation
# ne mord pas sur le haut de gamme).
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge

PLANCHER_SRGB = 5.0


def srgb2lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin2srgb(v):
    v = max(0.0, min(1.0, v))
    s = v * 12.92 if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055
    return max(0.0, min(255.0, s * 255.0))


PL = srgb2lin(PLANCHER_SRGB)


def paires(J, s, dx, dy, y0, y1, pas=3):
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
                out.append((pxr[X, Y], pxj[x, y]))
    return out


def q(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(len(v) * p / 100))]


def tiers(P):
    A = [lum(a) for a, b in P]
    t1 = q(A, 33.333)
    t2 = q(A, 66.667)
    return t1, t2


def simule_pixel(b, g):
    c = []
    for k in range(3):
        lv = srgb2lin(b[k])
        lv = max(0.0, lv - PL) * g + PL
        c.append(lin2srgb(lv))
    return tuple(c)


def bilan(P, t1, t2, g):
    gr = {'BAS': [[], []], 'MOY': [[], []], 'HAUT': [[], []]}
    hi = []
    for a, b in P:
        la = lum(a)
        bb = b if g == 1.0 else simule_pixel(b, g)
        lb = lum(bb)
        k = 'BAS' if la < t1 else ('MOY' if la < t2 else 'HAUT')
        gr[k][0].append(la)
        gr[k][1].append(lb)
        hi.append((la, lb, max(bb)))
    ligne = '  g=%.3f |' % g
    for k in ('BAS', 'MOY', 'HAUT'):
        a = sum(gr[k][0]) / len(gr[k][0])
        b = sum(gr[k][1]) / len(gr[k][1])
        ligne += ' %s %5.2f/%5.2f=%.3f |' % (k, b, a, b / a)
    A = [h[0] for h in hi]
    B = [h[1] for h in hi]
    mx = [h[2] for h in hi]
    ligne += ' p99 %5.1f/%5.1f=%.3f' % (q(B, 99), q(A, 99), q(B, 99) / q(A, 99))
    ligne += ' | p999 %5.1f/%5.1f' % (q(B, 99.9), q(A, 99.9))
    ligne += ' | canal max>250 : %.4f%%' % (100.0 * sum(1 for v in mx if v > 250) / len(mx))
    print(ligne, flush=True)


if __name__ == '__main__':
    s, dx, dy = float(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
    J = J19 if sys.argv[4] == '1920' else J24
    y0, y1 = int(sys.argv[5]), int(sys.argv[6])
    print('== recalage : REF = %.4f * JEU + (%d,%d)  [%s] ==' % (s, dx, dy, sys.argv[4]))
    P = paires(J, s, dx, dy, y0, y1)
    t1, t2 = tiers(P)
    print('  n=%d paires ; terciles de la REFERENCE : t1=%.2f  t2=%.2f' % (len(P), t1, t2))
    print('  (BAS = le tiers le plus sombre de la REFERENCE, etc. ; rapport = JEU/REF sur LES MEMES pixels)')
    for g in (1.0, 1.05, 1.095, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.50, 3.0):
        bilan(P, t1, t2, g)
