# -*- coding: utf-8 -*-
"""m1 — géométrie de la capture : bandeau, gouttière, dock, rythme vertical.
Contrôle positif : hauteur du bandeau dérivée du code = 52 CSS-HUD x 2,755 = 143 px ; on la MESURE."""
import commun as C

print('== m1 : geometrie de la capture ==')
cap = C.ouvrir('capture')
W, H = cap.size
px = cap.load()

# profil de luminance moyenne par ligne
print('\n-- lignes non vides (nb px L>45 sur toute la largeur) --')
prof = []
for y in range(H):
    n = 0; s = 0
    for x in range(0, W, 2):
        r, g, b = px[x, y]
        l = (r*299 + g*587 + b*114)//1000
        s += l
        if l > 45: n += 1
    prof.append((y, n*2, s/ (W//2)))

# bandes contiguës de contenu
bandes = []
dedans = False
for y, n, moy in prof:
    if n > 6 and not dedans:
        dedans = True; deb = y
    elif n <= 6 and dedans:
        dedans = False; bandes.append((deb, y-1, y-deb))
if dedans: bandes.append((deb, H-1, H-deb))
print('   %d bandes de contenu (>=4 px de haut) :' % len([b for b in bandes if b[2]>=4]))
for b in bandes:
    if b[2] >= 4:
        print('     y %4d..%4d  h=%4d' % b)

# le filet rouge du bandeau (ligne horizontale continue)
print('\n-- recherche du filet horizontal du bandeau (ligne >900 px allumes) --')
for y, n, moy in prof[:400]:
    if n > 900:
        print('     y=%4d  n=%4d  moy=%5.1f  couleur mediane x=200 : %s' % (y, n, moy, C.hx(C.mediane_fenetre(cap,200,y,1))))

# fond : médianes en plusieurs points loin de tout
print('\n-- FOND : medianes de fenetres 9x9 loin de toute encre --')
for (x, y, ou) in [(60,1300,'gauche milieu'),(540,1300,'centre milieu'),(1020,1300,'droite milieu'),
                   (540,1700,'centre bas'),(60,2000,'gauche bas'),(540,600,'centre haut-contenu'),
                   (540,2380,'sous le dock'),(30,40,'coin haut gauche (bandeau)')]:
    print('     %-22s (%4d,%4d) = %s' % (ou, x, y, C.hx(C.mediane_fenetre(cap,x,y,4))))
