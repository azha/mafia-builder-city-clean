# m17 : haut du DOCK, mesure sur le TEMOIN (bord net : la liste s'arrete au dock) et report sur les 2 planches.
import sys; sys.path.insert(0,'.')
from lib import *
im=ouvrir('temoin-menu-plus-1080x2400.png'); px=im.load()
print("   colonne x=5, y=2140..2175 :", " ".join("%d:%s"%(y,px[5,y]) for y in range(2140,2176)))
# bord net : derniere rangee de la liste
last=None
for y in range(2100,2250):
    if lum(px[5,y])>20: last=y
print("   derniere rangee de la LISTE (x=5) : y=%s  => haut du dock = %s" % (last,last+1))
for nom in ['capture-1080x2400.png','capture-1080x1920.png']:
    im2=ouvrir(nom); p2=im2.load(); W,H=im2.size
    print("   %s : colonne x=5, transition du fond -> dock" % nom)
    prev=None
    for y in range(H-400,H):
        c=p2[5,y]
        if prev and (c[2]-prev[2])>=1:
            pass
        prev=c
    base=[p2[5,y][2] for y in range(H-330,H-300)]
    b0=mediane(base)
    deb=next(y for y in range(H-330,H) if p2[5,y][2] >= b0+2)
    print("      fond nu B=%.0f ; le degrade du dock commence a y=%d ; bas de l'ecran H=%d ; hauteur du dock=%d px" % (b0,deb,H,H-deb))
