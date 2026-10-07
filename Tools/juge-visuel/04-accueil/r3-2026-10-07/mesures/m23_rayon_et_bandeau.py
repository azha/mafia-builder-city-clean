#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m23 — (1) RAYON d arrondi du bouton or, lu sur la COURBE (meme critere des deux cotes) ;
(2) TYPOGRAPHIE du bandeau : hauteur des chiffres du montant et capitale de la phase.
Les chaines du bandeau DIFFERENT (24 850 € / 10 000 € · Plein jour / Aube) : on ne compare donc
que des HAUTEURS, jamais des chasses.
Critere du rayon, identique des deux cotes : premier ecart vertical dy ou la largeur de la boite
atteint 98 % de sa largeur pleine. Pour un rect. arrondi de rayon r, cela arrive a dy ~ r.
Controle positif : la largeur pleine trouvee ici doit egaler celle du m9 (REF 329 · C24 324).
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
            dict(orbtn=(640, 1000, 944), montant=(40, 260, 66, 120), phase=(780, 1045, 66, 120))),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'),
            dict(orbtn=(640, 1000, 967), montant=(40, 260, 50, 105), phase=(900, 1045, 50, 105))),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'),
            dict(orbtn=(640, 1000, 1373), montant=(40, 260, 50, 105), phase=(900, 1045, 50, 105))),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def main():
    for k, (chemin, z) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        px = im.load()
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        x0, x1, ytop = z['orbtn']
        larg = []
        for dy in range(0, 45):
            xs = [x for x in range(x0, x1) if lum(px[x, ytop + dy]) > 110]
            larg.append(len(xs) and (xs[-1] - xs[0] + 1) or 0)
        pleine = max(larg)
        r = next((dy for dy, w in enumerate(larg) if w >= 0.98 * pleine), None)
        print('   BOUTON OR : largeur pleine %d px · 98 %% atteints a dy=%d  -> rayon ~%d px (%.1f px CSS)'
              % (pleine, r, r, r / 3.6))
        print('      courbe : %s' % ' '.join('%d:%d' % (d, w) for d, w in enumerate(larg) if d < 26))
        for nom in ('montant', 'phase'):
            a, b, c, d = z[nom]
            vals = sorted(lum(px[x, y]) for y in range(c, d) for x in range(a, b))
            fond = vals[len(vals) // 4]
            rows = [y for y in range(c, d) if sum(1 for x in range(a, b) if lum(px[x, y]) > fond + 45) > 2]
            cols = [x for x in range(a, b) if any(lum(px[x, y]) > fond + 45 for y in range(c, d))]
            if rows:
                print('   %-8s encre y %3d..%3d  HAUTEUR %2d px · x %4d..%4d (chasse %3d px, chaine DIFFERENTE)'
                      % (nom, rows[0], rows[-1], rows[-1] - rows[0] + 1, cols[0], cols[-1], cols[-1] - cols[0] + 1))
        print()


if __name__ == '__main__':
    main()
