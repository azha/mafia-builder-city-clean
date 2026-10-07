# m39 (le mien) — a 1080x2400 le decor N'EST PAS appariable : m34 ne trouve qu'une correlation de
# 0,35 (contre 0,80 a 1920 avec la MEME procedure, controle positif), parce que le cadrage COVER
# sur un ecran plus haut ne montre pas la meme fenetre du tableau. Toute conclusion de TON tiree
# de pixels apparies a 2400 serait donc fausse.
# On compare donc ce qui reste comparable sans appariement :
#   (1) la DISTRIBUTION de luminance du decor (REF vs 1920 vs 2400) ;
#   (2) les deux captures ENTRE ELLES — si leurs distributions coincident, le rendu du decor est
#       le meme aux deux resolutions et la conclusion mesuree a 1920 vaut pour 2400.
# CONTROLE POSITIF : REF comparee a elle-meme doit rendre un ecart nul sur tous les percentiles.
import sys
sys.path.insert(0, '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF, J19, J24, lum, charge


def echantillon(p, y0, y1, pas=2):
    im = charge(p)
    px = im.load()
    return [lum(px[x, y]) for y in range(y0, y1, pas) for x in range(60, 1020, 2)]


def q(v, p):
    return v[min(len(v) - 1, int(len(v) * p / 100))]


def table(jeux):
    noms = [n for n, _ in jeux]
    vals = {n: sorted(v) for n, v in jeux}
    print('  %-8s' % 'perc' + ''.join('%10s' % n for n in noms))
    for p in (1, 5, 10, 25, 50, 75, 90, 95, 99):
        print('  p%-7d' % p + ''.join('%10.2f' % q(vals[n], p) for n in noms))
    print('  %-8s' % 'moyenne' + ''.join('%10.2f' % (sum(vals[n]) / len(vals[n])) for n in noms))
    def et(v):
        m = sum(v) / len(v)
        return (sum((u - m) ** 2 for u in v) / len(v)) ** 0.5
    print('  %-8s' % 'ecart-t' + ''.join('%10.2f' % et(vals[n]) for n in noms))
    for s in (10, 12, 16, 20):
        print('  %-8s' % ('<%d' % s) + ''.join('%9.1f%%' % (100.0 * sum(1 for v in vals[n] if v < s) / len(vals[n])) for n in noms))


if __name__ == '__main__':
    r = echantillon(REF, 188, 816)
    a = echantillon(J19, 170, 740)
    b = echantillon(J24, 170, 1140)
    b2 = echantillon(J24, 170, 740)   # meme bande ECRAN que le 1920
    print('  n : REF=%d  JEU1920=%d  JEU2400(tout le decor)=%d  JEU2400(bande 170..740)=%d' % (len(r), len(a), len(b), len(b2)))
    print()
    print('  CONTROLE POSITIF — la REF comparee a elle-meme :')
    table([('REF', r), ('REF bis', list(r))])
    print()
    print('  distributions du DECOR (non appariees) :')
    table([('REF', r), ('JEU1920', a), ('J2400tout', b), ('J2400haut', b2)])
