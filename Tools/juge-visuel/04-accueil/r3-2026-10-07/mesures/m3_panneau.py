#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m3 — le PANNEAU « LA SUITE » : bords gauche/droite, filet laiton du bord haut, fond du verre.
Intention nommee par la CSS de l'atelier (jamais opposee au rendu) :
  .acc4 .verre { margin:0 12px 10px; border-radius:12px; border:1px solid #ffffff17;
                 background:linear-gradient(180deg,#0c1320ef,#080d17f6) }
  .acc4 .verre::after { left:14px; right:14px; top:0; height:1px;
                        background:linear-gradient(90deg,transparent,#b08d3e 30%,#b08d3e 70%,transparent) }
  -> a x3.6 : marge 43,2 px ; filet attendu de x=43,2+50,4=93,6 a x=1080-93,6=986,4 (892,8 px).
Controle positif : la LARGEUR du bandeau laiton du haut (barre::after, pleine largeur) doit etre
la meme dans les trois images -> si elle l'est, mon detecteur de filet laiton fonctionne.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IMG = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), 828, 2102),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), 886, 1920),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), 1292, 2400),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def etendue_laiton(im, y, seuil=45):
    """Colonnes ou la ligne y est nettement plus claire que la ligne y+6 (dessous) :
    signature d'un filet horizontal clair pose sur un fond sombre."""
    px = im.load()
    cols = []
    for x in range(im.width):
        a = lum(px[x, y]); b = lum(px[x, min(y + 6, im.height - 1)])
        if a - b > seuil:
            cols.append(x)
    if not cols:
        return None
    return cols[0], cols[-1], len(cols)


def bord_panneau(im, y):
    """Bords gauche/droite du panneau sur une ligne y : premiere/derniere colonne ou la
    luminance tombe sous le 25e centile de la ligne (le verre est tres sombre)."""
    px = im.load()
    vals = [lum(px[x, y]) for x in range(im.width)]
    tri = sorted(vals)
    seuil = tri[len(tri) // 4]
    dedans = [x for x in range(im.width) if vals[x] <= seuil + 3]
    return dedans[0], dedans[-1]


def mediane_fenetre(im, cx, cy, r=12):
    px = im.load()
    canaux = [[], [], []]
    for y in range(cy - r, cy + r):
        for x in range(cx - r, cx + r):
            p = px[x, y]
            for i in range(3):
                canaux[i].append(p[i])
    return tuple(sorted(c)[len(c) // 2] for c in canaux)


def main():
    print('=== CONTROLE POSITIF : filet laiton du BANDEAU (pleine largeur attendue) ===')
    for k, (chemin, _, _) in IMG.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        # le filet du bandeau est a y=144 (REF) / 142 (CAP) d'apres m1
        for y in (141, 142, 143, 144, 145):
            e = etendue_laiton(im, y, seuil=25)
            if e:
                print('   %s y=%d  filet bandeau : x %d..%d  (%d colonnes, %.1f%% de la largeur)'
                      % (k, y, e[0], e[1], e[2], 100.0 * e[2] / im.width))
    print()
    print('=== FILET LAITON DU BORD HAUT DU PANNEAU (verre::after) ===')
    print('   attendu (CSS x3,6) : x 94..986, soit 893 px = 82,7 %% de la largeur d ecran')
    for k, (chemin, ytop, _) in IMG.items():
        im = Image.open(chemin).convert('RGB')
        meilleur = None
        for y in range(ytop - 6, ytop + 8):
            e = etendue_laiton(im, y, seuil=25)
            if e and (meilleur is None or e[2] > meilleur[1][2]):
                meilleur = (y, e)
        if meilleur:
            y, e = meilleur
            print('   %s  y=%d  x %d..%d  (%d colonnes, %.1f%% de la largeur) — centre a x=%.0f'
                  % (k, y, e[0], e[1], e[2], 100.0 * e[2] / im.width, (e[0] + e[1]) / 2.0))
        else:
            print('   %s  AUCUN filet detecte autour de y=%d' % (k, ytop))
    print()
    print('=== BORDS GAUCHE/DROITE DU PANNEAU ===')
    print('   attendu (CSS marge 12 px x3,6) : gauche 43, droite 1037, largeur 994')
    for k, (chemin, ytop, _) in IMG.items():
        im = Image.open(chemin).convert('RGB')
        y = ytop + 120
        g, d = bord_panneau(im, y)
        print('   %s  y=%d  gauche=%d  droite=%d  largeur=%d  (marges %d / %d)'
              % (k, y, g, d, d - g + 1, g, im.width - 1 - d))
    print()
    print('=== FOND DU VERRE (mediane d une fenetre 24x24 sans texte) ===')
    for k, (chemin, ytop, _) in IMG.items():
        im = Image.open(chemin).convert('RGB')
        c = mediane_fenetre(im, 540, ytop + 40)
        print('   %s  fenetre (540, %d) -> RGB %s' % (k, ytop + 40, c))


if __name__ == '__main__':
    main()
