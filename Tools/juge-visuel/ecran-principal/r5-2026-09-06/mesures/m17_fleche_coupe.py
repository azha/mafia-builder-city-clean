# Grandeur : la fleche retour est-elle TRONQUEE au bord gauche ? etendue de l'encre par colonne.
from common import *
c=op(C24); px=c.load()
print('  CAP2400 : encre claire (L>fond+45) par colonne, x 0..30, y 70..100')
for x in range(0,30):
    ys=[y for y in range(70,102) if lum(px[x,y])>22+45]
    if ys: print(f'    x={x:2d} ({x/CAP_S:5.2f} CSS) : y {min(ys)}..{max(ys)} ({max(ys)-min(ys)+1} px de haut)')
    else:  print(f'    x={x:2d} : —')
