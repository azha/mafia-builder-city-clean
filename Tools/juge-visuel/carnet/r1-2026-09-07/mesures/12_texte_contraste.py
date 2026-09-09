# -*- coding: utf-8 -*-
"""Contraste et taille des textes de la CAPTURE (doctrine : >=3:1 grands, >=4,5:1 petits).
Encre = mediane des 5 % de pixels les plus CLAIRS d une ligne de texte ; fond = mediane globale
de la bande. Controle POSITIF : le titre 'Lt. Halde' (grand, clair) doit sortir tres au-dessus."""
from lib_mes import *

CAP = ouvrir('../capture-1080x2400.png'); P = CAP.load()
K = 1080/300.0   # contenu d ecran : 300 CSS (serie 6)

def bloc(y0, y1, x0, x1, nom):
    px = [P[x, y] for y in range(y0, y1) for x in range(x0, x1)]
    px.sort(key=lum)
    fond = px[len(px)//4]                    # quartile bas = fond
    encre = px[int(len(px)*0.985)]           # 1,5 % les plus clairs = encre
    c = contraste(encre, fond)
    # hauteur d encre : lignes contenant des pixels a > (lum(fond)+lum(encre))/2
    seuil = (lum(fond)+lum(encre))/2.0
    lignes = profil_lignes(CAP, x0, x1, lambda q: lum(q) > seuil, y0, y1)
    hs = [l[1]-l[0]+1 for l in lignes]
    print('   %-34s fond=%-15s encre=%-15s contraste=%5.2f:1  %d lignes d encre, hauteurs px=%s (max %.2f CSS)'
          % (nom, str(fond), str(encre), c, len(lignes), hs[:8], (max(hs)/K) if hs else 0))
    return c, len(lignes)

print('--- zones de texte de la capture (x en px image ; contenu a 3,60 px/CSS) ---')
bloc(1730, 1750, 44, 700, 'Diagnostics : ligne Verrouille')
bloc(1752, 2140, 44, 700, 'Diagnostics : liste des jetons')
bloc(2100, 2140, 44, 700, 'Diagnostics : derniere ligne AND_IF')
bloc(1540, 1570, 44, 700, 'Editeur de regles : sous-titre')
bloc(1300, 1330, 44, 700, 'AUTONOMIE : intitule de section')
bloc(730, 1060, 44, 1040, 'Table Nom/Archetype/... (10 rangees)')
bloc(230, 300, 240, 900, 'Titre Lt. Halde (controle positif)')
bloc(440, 500, 300, 800, 'Aucune equipe rattachee')
print()

print('--- comptage des lignes de la liste de jetons (attendu ~23 lignes) ---')
seuil_l = 45
lignes = profil_lignes(CAP, 44, 760, lambda q: lum(q) > seuil_l, 1725, 2145)
lignes = [l for l in lignes if l[1]-l[0] >= 3]
print('   %d lignes d encre detectees entre y=1725 et 2145 (seuil de luminance %d)' % (len(lignes), seuil_l))
print('   ' + ' '.join('%d-%d' % l for l in lignes))
