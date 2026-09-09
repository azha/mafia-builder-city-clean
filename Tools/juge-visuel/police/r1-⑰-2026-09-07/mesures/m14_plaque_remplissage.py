# -*- coding: utf-8 -*-
"""m14 — la carte/plaque est-elle REMPLIE (plaque plus claire que le sol) ou creuse (fil de fer) ?
Contrôle positif : sur le canon, l'intérieur d'une carte précinct doit être PLUS CLAIR que le sol voisin.
Contrôle négatif : sur la capture, si l'intérieur = le sol au bit près, la plaque n'existe pas."""
import commun as C

print('== m14 : remplissage des plaques ==')
can = C.ouvrir('canon2'); cap = C.ouvrir('capture'); vid = C.ouvrir('vide2')

def duo(im, nom, dedans, dehors):
    a = C.mediane_fenetre(im, dedans[0], dedans[1], 6)
    b = C.mediane_fenetre(im, dehors[0], dehors[1], 6)
    la=(a[0]*299+a[1]*587+a[2]*114)//1000; lb=(b[0]*299+b[1]*587+b[2]*114)//1000
    print('   %-34s interieur %s (L=%3d)   sol %s (L=%3d)   ecart L = %+d'
          % (nom, C.hx(a), la, C.hx(b), lb, la-lb))
    return la-lb

print('\n-- CONTRÔLE POSITIF : canon serie 2 --')
duo(can, 'panneau croyance', (450, 290), (450, 255))
duo(can, 'carte precinct 1', (600, 760), (450, 665))
duo(can, 'carte precinct 3', (600,1140), (450,1045))
print('\n-- CONTRÔLE : etat vide (cartouche pointille, pas de remplissage attendu) --')
duo(vid, 'cartouche vide', (450, 990), (450, 830))

print('\n-- CAPTURE --')
duo(cap, 'carte 1 (CE QU ILS CROIENT)', (540, 460), (540, 320))
duo(cap, 'carte 2 (LA PATROUILLE)',     (540, 735), (540, 605))
duo(cap, 'rangee 1 (Recruter)',         (200, 950), (540, 1020))
duo(cap, 'rangee 2 (Acheter)',          (200,1095), (540, 1200))

print('\n-- bordure : couleur ET ecart de luminance au sol --')
def bord(im, nom, y, x0,x1, ysol):
    p=im.load(); pts=[p[x,y] for x in range(x0,x1,3)]
    med=tuple(sorted(c[i] for c in pts)[len(pts)//2] for i in range(3))
    sol=C.mediane_fenetre(im, (x0+x1)//2, ysol, 5)
    lm=(med[0]*299+med[1]*587+med[2]*114)//1000; ls=(sol[0]*299+sol[1]*587+sol[2]*114)//1000
    print('   %-34s bordure %s (L=%3d)  sol %s (L=%3d)  ecart %+3d  R-B bordure %+d'
          % (nom, C.hx(med), lm, C.hx(sol), ls, lm-ls, med[0]-med[2]))
bord(can, 'canon panneau croyance (haut)', 271, 200, 700, 250)
bord(can, 'canon carte precinct 1 (haut)', 687, 200, 700, 665)
bord(cap, 'capture carte 1 (haut)',        348, 200, 900, 320)
bord(cap, 'capture rangee 1 (haut)',       895, 200, 600, 1200)
