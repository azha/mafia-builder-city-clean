# m34 — recalage du decor a 1080x2400.
# m29 a rendu r=0.22 : le cadrage COVER sur un ecran plus haut ne montre pas la meme fenetre du
# tableau ; la recherche doit donc etre BEAUCOUP plus large (s 0.80..1.35, dy -600..+300), sinon
# on conclut a tort « le decor du 2400 ne correspond pas a la reference ».
# CONTROLE POSITIF de la procedure elargie : relancee sur le 1080x1920 elle doit retrouver r>0.75.
# CONTROLE NEGATIF : un decalage volontaire de +60 px doit effondrer la correlation.
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge


def grille(pxj, xs, ys):
    return [(x, y, lum(pxj[x, y])) for y in ys for x in xs]


def corr(pxr, wr, hr, G, s, dx, dy):
    A = []
    B = []
    for x, y, lb in G:
        X = int(s * x + dx)
        Y = int(s * y + dy)
        if 0 <= X < wr and 0 <= Y < hr:
            A.append(lum(pxr[X, Y]))
            B.append(lb)
    n = len(A)
    if n < 0.5 * len(G):
        return None
    ma = sum(A) / n
    mb = sum(B) / n
    va = sum((v - ma) ** 2 for v in A)
    vb = sum((v - mb) ** 2 for v in B)
    if va <= 0 or vb <= 0:
        return None
    return sum((A[i] - ma) * (B[i] - mb) for i in range(n)) / ((va * vb) ** 0.5)


def recale(nom, J, yj0, yj1):
    ir = charge(REF)
    ij = charge(J)
    pxr = ir.load()
    pxj = ij.load()
    wr, hr = ir.size
    Gc = grille(pxj, range(80, 1000, 20), range(yj0, yj1, 20))
    best = None
    for i in range(0, 34):
        s = 0.80 + i * 0.0167
        for dx in range(-220, 141, 15):
            for dy in range(-600, 301, 15):
                c = corr(pxr, wr, hr, Gc, s, dx, dy)
                if c is not None and (best is None or c > best[0]):
                    best = (c, s, dx, dy)
    c, s, dx, dy = best
    print('  %s grossier : s=%.4f dx=%d dy=%d r=%.4f' % (nom, s, dx, dy, c), flush=True)
    Gf = grille(pxj, range(70, 1010, 6), range(yj0, yj1, 6))
    for ps, pt in ((0.006, 6), (0.002, 2), (0.001, 1)):
        cand = []
        for a in (-2, -1, 0, 1, 2):
            for b in (-2, -1, 0, 1, 2):
                for d in (-2, -1, 0, 1, 2):
                    cc = corr(pxr, wr, hr, Gf, s + a * ps, dx + b * pt, dy + d * pt)
                    if cc is not None:
                        cand.append((cc, s + a * ps, dx + b * pt, dy + d * pt))
        c, s, dx, dy = max(cand)
    print('  %s: MEILLEUR s=%.4f dx=%d dy=%d  r=%.4f' % (nom, s, dx, dy, c), flush=True)
    print('    CONTROLE NEGATIF dx+60 -> %.4f  dy+60 -> %.4f'
          % (corr(pxr, wr, hr, Gf, s, dx + 60, dy), corr(pxr, wr, hr, Gf, s, dx, dy + 60)), flush=True)
    return s, dx, dy


print('== CONTROLE POSITIF de la procedure elargie : 1080x1920 ==', flush=True)
recale('JEU1920', J19, 170, 740)
print('== 1080x2400 ==', flush=True)
recale('JEU2400', J24, 170, 1140)
