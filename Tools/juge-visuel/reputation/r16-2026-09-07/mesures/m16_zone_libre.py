# m16 : chrome (bandeau, dock) et occupation du cadre dans la zone libre.
# Controle positif : le filet du bandeau doit etre a la MEME rangee dans les 2 captures ET le temoin.
import sys; sys.path.insert(0,'.')
from lib import *

def filet_bandeau(px,W):
    for y in range(100,200):
        row=[lum(px[x,y]) for x in range(0,W)]
        if sum(1 for v in row if v>40)>0.7*W: return y
    return None

def haut_dock(im):
    """premiere rangee, en remontant depuis le bas, ou l'ecran cesse d'etre uniforme (ronds/libelles)"""
    px=im.load(); W,H=im.size
    ys=[]
    for y in range(H-1, H//2, -1):
        row=[lum(px[x,y]) for x in range(0,W)]
        m=mediane(row)
        if sum(1 for v in row if abs(v-m)>3)>30: ys.append(y)
    return (min(ys),max(ys)) if ys else None

for nom, cadre in [('capture-1080x2400.png',(482,2109)),('capture-1080x1920.png',(250,1629)),('temoin-menu-plus-1080x2400.png',None)]:
    im=ouvrir(nom); px=im.load(); W,H=im.size
    fb=filet_bandeau(px,W)
    print("   filet du bandeau : y=%s" % fb)
    d=haut_dock(im)
    print("   encre du dock : y=%s..%s" % d)
    # fond nu : rangees sans encre entre le bandeau et le dock
    if cadre:
        a,b=cadre
        print("   cadre : y=%d..%d (h=%d)" % (a,b,b-a+1))
        # premiere rangee encree sous le bandeau
        def encree(y):
            row=[lum(px[x,y]) for x in range(0,W)]
            m=mediane(row); return sum(1 for v in row if abs(v-m)>4)>8
        y=fb+1
        while y<H and not encree(y): y+=1
        print("   1re rangee encree sous le filet du bandeau : y=%d (%d px de fond nu)" % (y, y-fb-1))
        y2=d[0]-1
        while y2>0 and not encree(y2): y2-=1
        print("   derniere rangee encree au-dessus du dock : y=%d (%d px de fond nu)" % (y2, d[0]-y2-1))
    print()
