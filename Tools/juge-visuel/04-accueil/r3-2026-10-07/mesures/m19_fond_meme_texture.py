#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m19 — le FOND : MEME texture, assombrissement ABSENT.
La maquette pose, pour le cadre 4 :
    <div class="scene district" style="background-position:center 50%;filter:brightness(.42)">
    <div class="voile-scene">   (linear-gradient 180deg : alpha .80 a 0 % · .13 a 18 % · 0 a 40 % · .40 a 100 %)
La texture source est extraite de la page de l atelier (data:image/jpeg base64 de `.scene.district`)
et deposee ici : texture-source-district.jpg.
Prediction si le jeu n applique PAS l assombrissement : jeu / reference = 1 / 0,42 = 2,38 au milieu
(ou le voile est nul) et PLUS GRAND en haut et en bas (ou le voile mord).
Controle positif : la texture source doit porter les memes objets que les deux images (meme
immeuble central eclaire, meme quai, meme eau) -> on le verifie par la correlation des profils
de lignes, normalises.
Controle negatif : la correlation de la texture avec une image RETOURNEE doit chuter.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.abspath(os.path.join(ICI, '..', '..'))
TEX = os.path.join(ICI, 'texture-source-district.jpg')
REF = os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png')
C19 = os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png')
C24 = os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png')


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def profil(im, y0, y1, n=60):
    """Luminance moyenne de n tranches horizontales entre y0 et y1."""
    px = im.load()
    out = []
    pas = (y1 - y0) / float(n)
    for i in range(n):
        ya = int(y0 + i * pas); yb = int(y0 + (i + 1) * pas)
        s = 0.0; c = 0
        for y in range(ya, max(ya + 1, yb), 2):
            for x in range(0, im.width, 7):
                s += lum(px[x, y]); c += 1
        out.append(s / c)
    return out


def correl(a, b):
    n = len(a)
    ma = sum(a) / n; mb = sum(b) / n
    num = sum((a[i] - ma) * (b[i] - mb) for i in range(n))
    da = sum((v - ma) ** 2 for v in a) ** .5
    db = sum((v - mb) ** 2 for v in b) ** .5
    return num / (da * db) if da and db else 0.0


def main():
    tex = Image.open(TEX).convert('RGB')
    ref = Image.open(REF).convert('RGB')
    c19 = Image.open(C19).convert('RGB')
    c24 = Image.open(C24).convert('RGB')
    for n, im in (('texture source', tex), ('REF', ref), ('C19', c19), ('C24', c24)):
        print('LU %-15s %s' % (n, im.size))
    print()
    # bandes de decor VISIBLE (sous le bandeau, au-dessus du panneau)
    pt = profil(tex, 0, tex.height)
    pr = profil(ref, 150, 820)
    p1 = profil(c19, 150, 878)
    p2 = profil(c24, 150, 1284)
    # la portion de texture visible dans cette bande : du bandeau au panneau
    # (on compare les FORMES, pas les positions : correlation sur la tranche correspondante)
    def sous(p, a, b):
        return p[int(len(p) * a):int(len(p) * b)]
    print('=== CONTROLE POSITIF : correlation du profil vertical texture <-> images ===')
    tr = sous(pt, 0.07, 0.40)
    for n, p in (('REF', pr), ('C19', p1), ('C24', p2)):
        # reechantillonnage grossier a la meme longueur
        q = [p[int(i * (len(p) - 1) / (len(tr) - 1.0))] for i in range(len(tr))]
        print('   texture vs %-4s : r = %+.3f   |   [controle negatif, %s retourne] r = %+.3f'
              % (n, correl(tr, q), n, correl(tr, q[::-1])))
    print()
    print('=== RAPPORT DE LUMINANCE jeu / reference, par tiers de la bande de decor ===')
    print('   prediction si l assombrissement de la maquette (brightness .42) est ABSENT du jeu : 2,38')
    print('   et PLUS GRAND la ou le voile mord (haut : alpha .80 -> .13 ; bas : -> .40)')
    for nom, a, b in (('tiers HAUT  (voile fort)', 0.00, 0.33),
                      ('tiers MILIEU (voile nul)', 0.33, 0.66),
                      ('tiers BAS   (voile moyen)', 0.66, 1.00)):
        mr = sum(sous(pr, a, b)) / len(sous(pr, a, b))
        m1 = sum(sous(p1, a, b)) / len(sous(p1, a, b))
        m2 = sum(sous(p2, a, b)) / len(sous(p2, a, b))
        print('   %-26s REF %5.1f · C19 %5.1f (x%.2f) · C24 %5.1f (x%.2f)'
              % (nom, mr, m1, m1 / mr, m2, m2 / mr))
    print()
    print('=== EAU du quai (bas de la texture) — la bande qui apparait sous la barre TRANCHER ===')
    for nom, im, y0, y1 in (('texture source', tex, int(tex.height * .62), int(tex.height * .72)),
                            ('REF', ref, 1840, 2000), ('C19', c19, 1645, 1800), ('C24', c24, 2115, 2280)):
        px = im.load()
        ch = [[], [], []]
        for y in range(y0, y1, 3):
            for x in range(0, im.width, 5):
                p = px[x, y]
                for i in range(3):
                    ch[i].append(p[i])
        c = tuple(sorted(v)[len(v) // 2] for v in ch)
        print('   %-15s y %4d..%4d : RGB median %-16s lum %.1f  (B-R = %+d)'
              % (nom, y0, y1, str(c), lum(c), c[2] - c[0]))


if __name__ == '__main__':
    main()
