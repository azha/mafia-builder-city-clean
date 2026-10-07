#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m15 — barre TRANCHER (boite + interlettrage du mot IDENTIQUE « TRANCHER »),
degrade du bouton OR, et ORDRE DE LECTURE (ou est le plus clair de l ecran ?).
Intention CSS atelier : .suivant{margin:0 12px 10px;padding:8px 10px;border-radius:9px;
background:rgba(11,17,27,.86);border:1px solid #2a3648} · .act{letter-spacing:.14em;color:#f2c96b}
.g4.or{background:linear-gradient(180deg,#e9c56b,#c99a37)}  -> haut (233,197,107), bas (201,154,55)
Controle positif : le degre du bouton OR doit DESCENDRE du haut vers le bas dans les deux images.
Controle negatif : le meme profil pris dans le verre nu doit etre plat.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
            dict(trancher=(760, 1040, 1710, 1780), barre=(1670, 1830), or_btn=(700, 940, 945, 1037))),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'),
            dict(trancher=(760, 1040, 1520, 1590), barre=(1480, 1640), or_btn=(700, 940, 968, 1052))),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'),
            dict(trancher=(760, 1040, 1940, 2010), barre=(1900, 2060), or_btn=(700, 940, 1374, 1458))),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def glyphes(im, x0, x1, y0, y1, d=40):
    px = im.load()
    vals = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
    fond = vals[len(vals) // 4]
    s = fond + d
    cols = [x for x in range(x0, x1) if any(lum(px[x, y]) > s for y in range(y0, y1))]
    rows = [y for y in range(y0, y1) if any(lum(px[x, y]) > s for x in range(x0, x1))]
    if len(cols) < 5:
        return None
    grp = []; dd = cols[0]; p = cols[0]
    for x in cols[1:]:
        if x - p > 1:
            grp.append((dd, p)); dd = x
        p = x
    grp.append((dd, p))
    gaps = [grp[i + 1][0] - grp[i][1] - 1 for i in range(len(grp) - 1)]
    return dict(span=cols[-1] - cols[0] + 1, x0=cols[0], x1=cols[-1],
                cap=rows[-1] - rows[0] + 1, ngrp=len(grp), gaps=gaps,
                gapmoy=sum(gaps) / float(len(gaps)) if gaps else 0)


def main():
    for k, (chemin, z) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        px = im.load()
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        g = glyphes(im, *z['trancher'])
        if g:
            print('   « TRANCHER » : span %3d px · capitale %2d px · %d groupes · gaps %s · gap moyen %.1f px'
                  % (g['span'], g['cap'], g['ngrp'], g['gaps'], g['gapmoy']))
        # boite de la barre : plage sombre et plate, lignes les plus plates
        y0, y1 = z['barre']
        best = None
        for y in range(y0, y1):
            L = [lum(px[x, y]) for x in range(0, 1080)]
            m = sorted(L[300:800])[250]
            nn = sum(1 for v in L[300:800] if abs(v - m) > 8)
            if best is None or nn < best[1]:
                best = (y, nn, m, L)
        y, nn, m, L = best
        s = m + 12
        gl = 0
        while gl < 1080 and L[gl] > s:
            gl += 1
        dr = 1079
        while dr > 0 and L[dr] > s:
            dr -= 1
        print('   barre TRANCHER, ligne plate y=%d : x %d..%d (largeur %d px) · marges %d / %d · fond lum %.1f'
              % (y, gl, dr, dr - gl + 1, gl, 1079 - dr, m))
        # degrade du bouton OR
        bx0, bx1, by0, by1 = z['or_btn']
        prof = []
        for yy in range(by0 + 6, by1 - 5, max(1, (by1 - by0) // 8)):
            w = [px[x, yy] for x in range(bx0, bx1) if lum(px[x, yy]) > 100]
            if w:
                w.sort(key=lambda p: lum(p))
                prof.append((yy, w[len(w) // 2]))
        print('   bouton OR, profil vertical du remplissage :')
        for yy, c in prof:
            print('      y=%4d  RGB %s  lum %.1f' % (yy, c, lum(c)))
        print()

    # ordre de lecture : les 12 zones de 90x90 les plus claires de chaque image
    print('=== ORDRE DE LECTURE — les 8 blocs 90x90 les plus CLAIRS de l ecran ===')
    for k, (chemin, z) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        px = im.load()
        blocs = []
        for by in range(0, im.height - 90, 90):
            for bx in range(0, im.width - 90, 90):
                s = 0
                for y in range(by, by + 90, 6):
                    for x in range(bx, bx + 90, 6):
                        s += lum(px[x, y])
                blocs.append((s / 225.0, bx, by))
        blocs.sort(reverse=True)
        print('   %s : %s' % (k, ' · '.join('(%d,%d)=%.0f' % (b[1], b[2], b[0]) for b in blocs[:8])))


if __name__ == '__main__':
    main()
