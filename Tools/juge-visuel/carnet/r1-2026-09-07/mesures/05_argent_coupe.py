# -*- coding: utf-8 -*-
"""Le glyphe EURO de la valeur ARGENT est-il COUPE par le medaillon ?
Predicat OR durci : la braise (224,102,73) doit etre EXCLUE (controle negatif interne).
"""
from lib_mes import *

CAP = ouvrir('../capture-1080x2400.png')
p = CAP.load()

def dore(c):
    r, g, b = c
    return r > 140 and g >= 0.62*r and b < 0.72*g and g > 100

# controles du predicat
print('   predicat OR : or #f2c96b -> %s | or #d9ab4e -> %s | BRAISE 224,102,73 -> %s | fond 12,16,27 -> %s'
      % (dore((242,201,107)), dore((217,171,78)), dore((224,102,73)), dore((12,16,27))))
print('   (la braise DOIT rendre False : controle negatif du predicat)')
print()

seg = profil_colonnes(CAP, 60, 100, dore, 100, 700)
print('--- segments de colonnes portant de l encre OR, y=60..100 ---')
for s in seg:
    print('   x=%3d..%3d  (larg %d)' % (s[0], s[1], s[1]-s[0]+1))
print()

# couleur de l encre : mediane sur un plein de glyphe
for (cx, cy) in [(186, 80), (300, 80), (440, 78)]:
    print('   encre a (%d,%d) mediane 3x3 = %s' % (cx, cy, mediane_fenetre(CAP, cx, cy, 1)))
print()

last = seg[-1]
print('--- profil horizontal a partir de la fin du dernier segment or (x=%d) ---' % last[1])
for y in [70, 75, 80, 85]:
    ch = []
    for x in range(last[1]-3, last[1]+16):
        c = p[x, y]
        tag = 'OR' if dore(c) else ('BR' if (c[0] > 110 and c[1] < c[0]-45 and c[2] < c[0]-45) else '..')
        ch.append('%d%s%s' % (x, tag, c))
    print('   y=%d : %s' % (y, ' '.join(ch)))
print()

print('--- controle POSITIF : fin du glyphe precedent (segment %s), doit finir sur le FOND ---' % (seg[-2],))
s0 = seg[-2]
for y in [80]:
    ch = []
    for x in range(s0[1]-2, s0[1]+12):
        c = p[x, y]
        tag = 'OR' if dore(c) else ('BR' if (c[0] > 110 and c[1] < c[0]-45 and c[2] < c[0]-45) else '..')
        ch.append('%d%s%s' % (x, tag, c))
    print('   y=%d : %s' % (y, ' '.join(ch)))
