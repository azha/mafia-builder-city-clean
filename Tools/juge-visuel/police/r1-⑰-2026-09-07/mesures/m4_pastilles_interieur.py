# -*- coding: utf-8 -*-
"""m4 — l'intérieur des pastilles est-il VIDE (aplat de fond) ou porte-t-il une encre sombre ?
Contrôle positif : la même sonde sur l'intérieur d'un jeton du canon (qui porte un libellé clair)
doit rendre une étendue >> 0. Contrôle négatif : un carré de fond pur rend une étendue de 0."""
import commun as C

print('== m4 : interieur des pastilles ==')
cap = C.ouvrir('capture'); can = C.ouvrir('canon2')

def etendue(im, x0,y0,x1,y1):
    p = im.load(); vals=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b = p[x,y]
            vals.append((r*299+g*587+b*114)//1000)
    return min(vals), max(vals), max(vals)-min(vals), len(vals)

print('\n-- CAPTURE : interieur strict (inset 6 px) des 8 pastilles --')
for nom, ybase in [('carte 1', (524,544)), ('carte 2', (798,819))]:
    for x0 in (322,434,545,657):
        mn,mx,et,n = etendue(cap, x0+6, ybase[0]+5, x0+101-6, ybase[1]-4)
        print('   %s x=%4d : L min=%3d max=%3d ETENDUE=%3d (n=%d)' % (nom,x0,mn,mx,et,n))

print('\n-- CONTRÔLE POSITIF : interieur d\'un jeton LIBELLE du canon serie 2 --')
mn,mx,et,n = etendue(can, 90, 505, 450, 545)
print('   canon jeton "CONVICTION..." : L min=%3d max=%3d ETENDUE=%3d (n=%d)' % (mn,mx,et,n))

print('\n-- CONTRÔLE NEGATIF : carre de fond pur de la capture --')
mn,mx,et,n = etendue(cap, 300,1400, 500,1450)
print('   fond vide : L min=%3d max=%3d ETENDUE=%3d (n=%d)' % (mn,mx,et,n))

print('\n-- geometrie des pastilles --')
print('   4 pastilles identiques 101x%d px, pas=%d px, empan x=322..757 (436 px), centre=%.1f (ecran 540)'
      % (544-524+1, 434-322, (322+757)/2))
