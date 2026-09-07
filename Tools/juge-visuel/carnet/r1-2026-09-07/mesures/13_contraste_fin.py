# -*- coding: utf-8 -*-
"""Contraste FIN des petits textes : encre = mediane des pixels du coeur des glyphes
(les plus clairs, hors frange), fond = mediane a >=3 px de toute encre."""
from lib_mes import *

CAP = ouvrir('../capture-1080x2400.png'); P = CAP.load()

def mesure(y0, y1, x0, x1, nom, part=0.06):
    px = [(lum(P[x, y]), P[x, y]) for y in range(y0, y1+1) for x in range(x0, x1)]
    px.sort()
    n = len(px)
    fond = px[n//3][1]
    coeur = px[int(n*(1-part)):]
    coeur.sort()
    encre = coeur[len(coeur)//2][1]
    pic = px[-1][1]
    print('   %-30s y=%d..%d  fond=%-15s encre=%-15s pic=%-15s  C_encre=%5.2f:1  C_pic=%5.2f:1'
          % (nom, y0, y1, str(fond), str(encre), str(pic), contraste(encre, fond), contraste(pic, fond)))

print('--- lignes de la liste de jetons (petits textes, doctrine >= 4,5:1) ---')
mesure(1728, 1738, 44, 700, 'Verrouille (gras, controle +)')
mesure(1749, 1757, 44, 300, 'Declencheurs (intitule)')
mesure(1767, 1775, 48, 300, 'TIME + soon')
mesure(1851, 1860, 48, 400, 'REQUEST_PLAYER_INPUT + soon')
mesure(1902, 1911, 48, 400, 'ABORT_CURRENT_TASK + soon')
mesure(2104, 2112, 48, 300, 'AND_IF + Tier 2')
print()
print('--- controles positifs (grands textes) ---')
mesure(232, 296, 250, 560, 'Lt. Halde (titre)')
mesure(2325, 2345, 208, 311, 'EMPIRE (dock)')
mesure(1030, 1046, 60, 340, 'Gain de rendement (rangee)')
print()
print('--- couleur exacte du texte des jetons : histogramme des 12 pixels les plus clairs ---')
px = sorted([(lum(P[x, y]), P[x, y]) for y in range(1851, 1861) for x in range(48, 400)])
for l, c in px[-12:]:
    print('      %s  lum=%.1f' % (str(c), l))
