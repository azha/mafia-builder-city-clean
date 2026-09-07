# -*- coding: utf-8 -*-
"""15 - Le JETON : diametre, couleur, et presence d'une GRAVURE.
Indicateur de gravure : existe-t-il, a l'interieur du disque, des pixels NETTEMENT plus sombres
que la mediane du disque (un glyphe grave) ? Plus l'ecart max est grand, plus il y a du dessin.
CONTROLE POSITIF : le jeton de la REFERENCE (grave d'un T) doit rendre un ecart sombre marque.
CONTROLE NEGATIF : un disque de degrade pur ne doit rendre qu'une variation douce."""
from PIL import Image
import statistics, os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def disque(im,cx,cy,r,nom):
    px=im.load(); vals=[];cols=[]
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            if (x-cx)**2+(y-cy)**2 <= (r*0.72)**2:
                vals.append(lum(px[x,y])); cols.append(px[x,y])
    m=statistics.median(vals)
    mini=min(vals); maxi=max(vals)
    c=tuple(int(statistics.median([p[k] for p in cols])) for k in range(3))
    print("   %-30s r=%2d  mediane L=%6.1f  min=%6.1f  max=%6.1f  creux=%.0f %%  couleur mediane=%s"
          %(nom,r,m,mini,maxi,100*(m-mini)/max(m,1),c))
R=ouvrir('../reference-㉓-1080x2102.png'); C=ouvrir('../capture-1080x2400.png')
print()
# jeton de la reference (boite de solde) : localiser par bbox d'encre claire
px=R.load()
best=None
for cy in range(495,520):
    for cx in range(735,765):
        pass
disque(R,751,506,23,"REF jeton .solde (13 px CSS)")
disque(R,240,1088,20,"REF jeton .etiq (11 px CSS)")
disque(C,92,586,21,"CAP disque de carte")
print()
print("   bornes mesurees du disque CAP :")
def bbox(im,box,seuil):
    p=im.load();x0,y0,x1,y1=box
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(p[x,y])>seuil]
    xs=[q[0] for q in pts];ys=[q[1] for q in pts]
    return (min(xs),min(ys),max(xs),max(ys))
b=bbox(C,(60,555,130,620),35); print("     bbox=%s  d=%dx%d px = %.1fx%.1f CSS"%(b,b[2]-b[0]+1,b[3]-b[1]+1,(b[2]-b[0]+1)/3.6,(b[3]-b[1]+1)/3.6))
b=bbox(R,(725,480,780,535),60); print("     REF .solde jeton bbox=%s  d=%dx%d px = %.1fx%.1f CSS"%(b,b[2]-b[0]+1,b[3]-b[1]+1,(b[2]-b[0]+1)/3.6,(b[3]-b[1]+1)/3.6))
