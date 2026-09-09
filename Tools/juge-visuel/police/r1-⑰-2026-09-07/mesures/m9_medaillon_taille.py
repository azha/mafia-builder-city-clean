# -*- coding: utf-8 -*-
"""m9 — diamètre du médaillon, mesuré sur une LIGNE passant par son centre (pas de bbox polluée).
Contrôle positif : le même balayage sur le canon HUD doit retrouver un disque unique, contigu."""
import commun as C

print('== m9 : diametre du medaillon ==')
cap = C.ouvrir('capture'); hud = C.ouvrir('hud')

def scan_ligne(im, nom, y, x0, x1, test, label):
    p = im.load(); xs=[x for x in range(x0,x1) if test(p[x,y])]
    if not xs: print('   %-12s y=%4d : rien' % (nom,y)); return None
    print('   %-12s y=%4d %-8s x=%d..%d  diametre=%d px  = %.2f %% de la largeur (%d)'
          % (nom, y, label, min(xs), max(xs), max(xs)-min(xs)+1, 100.0*(max(xs)-min(xs)+1)/im.size[0], im.size[0]))
    return min(xs), max(xs)

# anneau braise de la capture : ligne au centre vertical du medaillon
braise = lambda p: p[0]>140 and p[0]-p[1]>60 and p[0]-p[2]>60
laiton = lambda p: p[0]>140 and p[1]>105 and p[2]<115 and p[0]-p[2]>60
print('\n-- CAPTURE : anneau braise, plusieurs lignes --')
for y in (80, 95, 110):
    scan_ligne(cap, 'capture', y, 300, 800, braise, 'braise')
print('\n-- CANON HUD : anneau laiton, plusieurs lignes (bandeau seul, y<150) --')
for y in (95, 110, 125):
    scan_ligne(hud, 'canon HUD', y, 400, 820, laiton, 'laiton')

print('\n-- disque SOMBRE du medaillon (interieur), ligne centrale --')
sombre = lambda p: p[0]<70 and p[1]<80 and p[2]<95 and p[2]>=p[0]
for y in (95,):
    scan_ligne(cap, 'capture', y, 380, 720, sombre, 'disque')
    scan_ligne(hud, 'canon HUD', y, 440, 760, sombre, 'disque')

print('\n-- hauteur du bandeau : filet horizontal --')
def filet(im, nom, ymax, test):
    p=im.load(); W=im.size[0]
    for y in range(ymax):
        n=sum(1 for x in range(0,W,4) if test(p[x,y]))
        if n > W//4//2:
            print('   %-12s filet a y=%d (%.2f %% de la hauteur %d)' % (nom,y,100.0*y/im.size[1],im.size[1])); return y
    return None
filet(cap, 'capture', 300, braise)
filet(hud, 'canon HUD', 300, laiton)
