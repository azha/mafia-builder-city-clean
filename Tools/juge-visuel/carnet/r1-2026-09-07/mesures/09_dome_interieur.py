# -*- coding: utf-8 -*-
"""Y a-t-il, sous l arc, une forme PLEINE a base plate (un 'dome') dans la capture ?
Profils de luminance a l interieur du medaillon.
Controle : le meme profil sur la REFERENCE et le CANON, aux memes rayons relatifs."""
from lib_mes import *

for nom, chemin, cx, cy, R in [('REFERENCE','../reference-1080x2102.png',537,120,90),
                               ('CANON','../hud-canon-1176.png',587,116,95),
                               ('CAPTURE','../capture-1080x2400.png',540,110,91)]:
    im = ouvrir(chemin); p = im.load()
    print('   %s : profil VERTICAL a x=%d (centre), de y=%d a y=%d' % (nom, cx, cy-R+8, cy+R-8))
    ligne = []
    for y in range(cy-R+8, cy+R-8, 4):
        c = p[cx, y]
        ligne.append('%d:%s(%.0f)' % (y, c, lum(c)))
    print('      ' + ' '.join(ligne))
    print('   %s : profil HORIZONTAL a y=%d (juste sous le sommet de l arc)' % (nom, cy-10))
    ligne = []
    for x in range(cx-R+10, cx+R-10, 6):
        c = p[x, cy-10]
        ligne.append('%d:%.0f' % (x, lum(c)))
    print('      ' + ' '.join(ligne))
    print()
