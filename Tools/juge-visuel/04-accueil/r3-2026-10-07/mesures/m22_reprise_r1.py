#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m22 — reprise des grandeurs que le tour 1 avait trouvees fausses, mesurees a neuf.
(a) bande neutre sous le bandeau : existe-t-il encore un rectangle plein uniforme ?
(b) couleur de « TRANCHER », de « LA SUITE », des titres, du bouton or -> combien d ors distincts ?
(c) typographie du bandeau : montant et phase (chaines DIFFERENTES : on compare la HAUTEUR
    de capitale / des chiffres, jamais la chasse).
(d) rayon d arrondi du bouton or, lu par l elargissement de la boite ligne apres ligne.
Controle positif : la couleur du titre de rangee doit etre (242,201,107) des deux cotes (jeton
--or-vif) -> si oui, la sonde de couleur est bonne et un ECART ailleurs est reel.
Controle negatif : l ecart-type d une bande d ART doit etre > 3 (l art n est jamais uniforme).
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
            dict(bande=(150, 260), trancher=(760, 1020, 1712, 1745), lasuite=(440, 640, 865, 892),
                 titre=(150, 600, 945, 980), orbtn=(600, 1000, 940, 1045))),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'),
            dict(bande=(148, 258), trancher=(760, 1020, 1530, 1562), lasuite=(440, 640, 915, 940),
                 titre=(150, 600, 974, 1008), orbtn=(600, 1000, 963, 1060))),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'),
            dict(bande=(148, 258), trancher=(760, 1020, 1945, 1978), lasuite=(440, 640, 1322, 1348),
                 titre=(150, 600, 1380, 1414), orbtn=(600, 1000, 1369, 1466))),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def ecart_type(v):
    m = sum(v) / len(v)
    return (sum((x - m) ** 2 for x in v) / len(v)) ** .5, m


def couleur(im, x0, x1, y0, y1, d=40):
    px = im.load()
    vals = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
    fond = vals[len(vals) // 4]
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if lum(px[x, y]) > fond + d]
    if len(pts) < 20:
        return None, 0
    pts.sort(key=lambda p: -lum(px[p[0], p[1]]))
    noy = pts[:max(1, len(pts) // 8)]
    ch = [[], [], []]
    for x, y in noy:
        q = px[x, y]
        for i in range(3):
            ch[i].append(q[i])
    return tuple(sorted(c)[len(c) // 2] for c in ch), len(pts)


def main():
    for k, (chemin, z) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        px = im.load()
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        # (a) bande uniforme ?
        y0, y1 = z['bande']
        pire = None
        for y in range(y0, y1):
            v = [lum(px[x, y]) for x in range(0, 1080, 3)]
            s, m = ecart_type(v)
            if pire is None or s < pire[1]:
                pire = (y, s, m)
        print('   (a) ligne la PLUS uniforme entre y=%d et %d : y=%d  ecart-type %.2f  luminance %.1f'
              % (y0, y1, pire[0], pire[1], pire[2]))
        v = [lum(px[x, y]) for y in range(y0, y1, 3) for x in range(0, 1080, 7)]
        s, m = ecart_type(v)
        print('       bande entiere : ecart-type %.2f · luminance %.1f  [controle negatif : l art n est jamais uniforme]'
              % (s, m))
        # (b) ors
        ors = {}
        for nom in ('trancher', 'titre'):
            c, n = couleur(im, *z[nom])
            ors[nom] = c
            print('   (b) %-9s RGB %-16s (%d px d encre)' % (nom, str(c), n))
        c, n = couleur(im, *z['lasuite'])
        print('   (b) %-9s RGB %-16s (%d px d encre)' % ('lasuite', str(c), n))
        bx0, bx1, by0, by1 = z['orbtn']
        haut = [px[x, by0 + 10] for x in range(bx0, bx1) if lum(px[x, by0 + 10]) > 120]
        bas = [px[x, by1 - 12] for x in range(bx0, bx1) if lum(px[x, by1 - 12]) > 120]
        if haut and bas:
            haut.sort(key=lum); bas.sort(key=lum)
            ors['bouton'] = haut[len(haut) // 2]
            print('   (b) %-9s haut %s · bas %s' % ('bouton or', haut[len(haut) // 2], bas[len(bas) // 2]))
        vals = [c for c in ors.values() if c]
        if len(vals) >= 3:
            for i, nomc in enumerate('RGB'):
                e = max(c[i] for c in vals) - min(c[i] for c in vals)
                print('       etendue des ors sur %s : %d' % (nomc, e))
        # (d) rayon du bouton or : largeur de la boite ligne par ligne depuis son haut
        print('   (d) bouton or : largeur de la boite, ligne par ligne depuis le haut')
        prem = None
        for dy in range(0, 30):
            y = by0 + dy
            xs = [x for x in range(bx0, bx1) if lum(px[x, y]) > 110]
            if xs:
                if prem is None:
                    prem = (dy, xs[0], xs[-1])
                if dy in (0, 1, 2, 4, 6, 9, 12, 16, 20, 26):
                    print('       +%2d : x %4d..%4d  (largeur %3d)' % (dy, xs[0], xs[-1], xs[-1] - xs[0] + 1))
        print()


if __name__ == '__main__':
    main()
