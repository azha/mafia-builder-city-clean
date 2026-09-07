# -*- coding: utf-8 -*-
"""1) Position de l aile ARGENT dans la REFERENCE (temoin n2 du chrome, en CSS serie-6 = 300).
   2) Rails dores orphelins de la CAPTURE (ecran photographie, hors perimetre ㉞)."""
from lib_mes import *

REF = ouvrir('../reference-1080x2102.png')
CAP = ouvrir('../capture-1080x2400.png'); PC = CAP.load()
KR, KC6, KCH = 1080/300.0, 1080/300.0, 1080/392.0

def clair(c): return lum(c) > 90
print('--- REFERENCE : aile gauche du bandeau-evocation ---')
ls = profil_lignes(REF, 0, 420, clair, 10, 130)
for l in ls:
    b = bbox(REF, clair, 0, l[0], 420, l[1]+1)
    print('   y=%3d..%3d x=%3d..%3d  hauteur=%2d px = %.2f CSS(300)  bord gauche=%.1f CSS(300) = %.1f %% de la largeur'
          % (l[0], l[1], b[0], b[2], l[1]-l[0]+1, (l[1]-l[0]+1)/KR, b[0]/KR, 100.0*b[0]/1080))
print()
print('   CAPTURE  bord gauche du libelle ARGENT = 177 px = %.1f %% de la largeur (mesure 16)' % (100.0*177/1080))
print('   CANON    bord gauche du libelle ARGENT =  48 px = %.1f %% de la largeur (mesure 16)' % (100.0*48/1176))
print()

print('--- CAPTURE : rails dores verticaux orphelins (x<200, zone de la carte) ---')
def dore(c):
    r,g,b = c
    return r > 90 and g >= 0.55*r and b < 0.80*g and g > 60 and lum(c) > 55
seg = profil_colonnes(CAP, 200, 700, dore, 40, 200)
print('   colonnes portant de l or entre y=200 et 700, x=40..200 : %s' % seg)
for s in seg:
    ls = profil_lignes(CAP, s[0], s[1]+1, dore, 150, 760)
    print('        x=%d..%d : blocs verticaux y = %s' % (s[0], s[1], ls))
