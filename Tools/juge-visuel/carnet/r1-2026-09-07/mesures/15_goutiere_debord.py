# -*- coding: utf-8 -*-
"""Gouttiere et debordement dans la CAPTURE.
Rect libre derive du code et VERIFIE sur l image : bandeau 0..142 (filet 141-142), dock 2152..2399.
Controle POSITIF : la largeur du bandeau doit valoir 1080 (pleine largeur)."""
from lib_mes import *

CAP = ouvrir('../capture-1080x2400.png'); P = CAP.load()
K = 1080/300.0     # contenu (serie 6 : 300 CSS)
KH = 1080/392.0    # chrome (HUD : 392 CSS)

print('--- controle positif : le filet du bandeau couvre-t-il toute la largeur ? ---')
def braise(c):
    r,g,b = c
    return r > 150 and g < r-60 and b < r-70
xs = [x for x in range(1080) if braise(P[x, 141])]
print('   y=141 : %d colonnes braise sur 1080  (x=%d..%d)' % (len(xs), min(xs), max(xs)))
print()

print('--- carte du lieutenant : le panneau deborde-t-il a droite ? ---')
def panneau(c):
    return abs(c[0]-24) <= 12 and abs(c[1]-31) <= 12 and abs(c[2]-48) <= 14
for y in [250, 300, 340]:
    xs = [x for x in range(90, 1080) if panneau(P[x, y])]
    if xs:
        seg_fin = max(xs)
        print('   y=%3d : panneau de x=%d a x=%d   ; pixel du bord droit (1079) = %s'
              % (y, min(xs), seg_fin, P[1079, y]))
print('   couleur au bord droit a y=300 : %s ; a y=300, x=1070 : %s' % (P[1079, 300], P[1070, 300]))
print('   -> le panneau atteint-il la colonne 1079 ? %s' % ('OUI (coupe par le bord)' if panneau(P[1079,300]) else 'non'))
print()

print('--- marge droite des blocs de contenu (px puis CSS contenu) ---')
def encre(c): return lum(c) > 60
for nom, y0, y1 in [('carte lieutenant', 240, 350), ('bloc Aucune equipe', 420, 520),
                    ('bloc Recruter', 570, 700), ('table', 730, 1060),
                    ('liste jetons', 1750, 2140), ('boutons Autonomie', 1290, 1420)]:
    b = bbox(CAP, encre, 0, y0, 1080, y1)
    if b[0] is None: continue
    print('   %-22s x=%4d..%4d  marge gauche=%5.1f CSS  marge droite=%5.1f CSS'
          % (nom, b[0], b[2], b[0]/K, (1079-b[2])/K))
print()

print('--- gouttiere : y a-t-il de l encre du CONTENU sous le bandeau (y<143) ou sous le dock (y>2151) ? ---')
b = bbox(CAP, encre, 0, 0, 1080, 143)
print('   au-dessus de y=143 : encre bbox=%s  (chrome attendu : ARGENT, medaillon, JOUR)' % (b[:4],))
b2 = bbox(CAP, encre, 0, 143, 1080, 210)
print('   y=143..209 : encre bbox=%s  n=%d  -> debordement du medaillon (chrome, autorise)' % (b2[:4], b2[4]))
b3 = bbox(CAP, encre, 0, 2152, 1080, 2400)
print('   y>=2152 (dock) : encre bbox=%s' % (b3[:4],))
b4 = bbox(CAP, encre, 0, 2120, 1080, 2152)
print('   y=2120..2151 (juste au-dessus du dock) : encre bbox=%s  n=%d' % (b4[:4], b4[4]))
