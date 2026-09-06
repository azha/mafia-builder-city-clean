"""m19 (v2) — bandes de TEXTE, chaque bloc ancre sur SES PROPRES bornes (m04), pas sur le
cadre : v1 ancrait tout sur le filet du cadre et le panneau bas du jeu, plus haut de 93 px,
sortait de la fenetre. Les fenetres x sont resserrees pour ne pas ramasser le rail or de
la carte ni l'aparte de droite (v1 fusionnait « Pas encore » et « jugeable » en une bande
de 71 px cote jeu).
Encre d'une rangee : luminance > mediane de la rangee + marge (fond local par rangee).
Controle positif : titre « Le miroir » = 48 px de capitale des DEUX cotes.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane, contraste

BLOCS = {
 'REF':     dict(f='../reference-1080x2102.png',
                 enseigne=(481,669), compt=(702,815), elast=(848,1613), bas=(1647,1919), cta=(1952,2046)),
 'JEU2400': dict(f='../capture-1080x2400.png',
                 enseigne=(512,693), compt=(728,840), elast=(874,1550), bas=(1584,1850), cta=(1882,1970)),
 'JEU1920': dict(f='../capture-1080x1920.png',
                 enseigne=(192,373), compt=(408,520), elast=(556,1229), bas=(1264,1529), cta=(1562,1647)),
}
ZONES = [('enseigne : titre + sous-titre', 'enseigne', 0, 999, 40, 1040, 40),
         ('carte : libelle du haut',       'elast',    10, 120, 95, 495, 25),
         ('colonne dr. : "Pas encore jugeable"', 'elast', 10, 130, 528, 800, 25),
         ('colonne dr. : aparte',          'elast',    10, 130, 810, 1030, 22),
         ('carte : "Il vous ecoute" + mention', 'elast', 480, 700, 95, 495, 25),
         ('panneau bas : 5 lignes',        'bas',       0, 999, 60, 1030, 25),
         ('CTA : libelle',                 'cta',       0, 999, 60, 1030, 40)]

for nom, B in BLOCS.items():
    im = ouvrir(B['f']); px = im.load(); H = im.size[1]
    print(f"\n===== {nom} =====")
    for zn, cle, o0, o1, xa, xb, marge in ZONES:
        b0, b1 = B[cle]
        y0, y1 = b0+o0, min(H-1, min(b1, b0+o1))
        runs = []; cur = None
        for y in range(y0, y1+1):
            ref = mediane([lum(px[x, y]) for x in range(xa, xb+1)])
            xs = [x for x in range(xa, xb+1) if lum(px[x, y]) > ref + marge]
            if len(xs) >= 6:
                if cur is None: cur = [y, y, min(xs), max(xs), len(xs)]
                else:
                    cur[1] = y; cur[2] = min(cur[2], min(xs)); cur[3] = max(cur[3], max(xs)); cur[4] += len(xs)
            else:
                if cur is not None: runs.append(tuple(cur)); cur = None
        if cur is not None: runs.append(tuple(cur))
        runs = [r for r in runs if r[1]-r[0] >= 4]
        print(f"  [{zn}] bloc y{b0}..{b1} · seuil +{marge} · {len(runs)} bande(s)")
        for a, b, x0, x1, n in runs:
            print(f"     off/bloc {a-b0:4d}..{b-b0:4d}  h={b-a+1:3d}  x{x0}..{x1} (l={x1-x0+1:4d})  encre={n:6d}")
