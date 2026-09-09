# m21 : frontieres horizontales du contenu — D(y) = moyenne |L(x,y)-L(x,y-1)| sur la largeur du cadre.
# Controle positif : les rails or du cadre et le filet or du titre doivent ressortir en tete.
import sys; sys.path.insert(0,'.')
from lib import *
CAS=[('reference-1080x2102.png',445,2090,30,1050),
     ('capture-1080x2400.png',475,2120,26,1052),
     ('capture-1080x1920.png',243,1640,26,1052)]
for nom,ya,yb,xa,xb in CAS:
    im=ouvrir(nom); px=im.load()
    D=[]
    for y in range(ya+1,yb):
        s=sum(abs(lum(px[x,y])-lum(px[x,y-1])) for x in range(xa,xb))/(xb-xa)
        D.append((y,s))
    pics=[(y,s) for y,s in D if s>1.2]
    g=[]
    for y,s in pics:
        if g and y-g[-1][-1][0]<=2: g[-1].append((y,s))
        else: g.append([(y,s)])
    print("   frontieres (|dL/dy| moyen > 1,2) :")
    for a in g:
        ymax=max(a,key=lambda t:t[1])
        print("      y=%4d..%-4d  pic=%5.1f a y=%d" % (a[0][0],a[-1][0],ymax[1],ymax[0]))
    print()
