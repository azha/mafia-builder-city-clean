# -*- coding: utf-8 -*-
"""14 - Contrastes WCAG des textes de la CAPTURE, mesures sur l'art reel (fond echantillonne
a >=3 px du bord de l'encre, mediane de fenetre).
CONTROLE POSITIF : blanc pur sur noir pur doit rendre 21,00:1.
CONTROLE NEGATIF : une couleur sur elle-meme doit rendre 1,00:1."""
from PIL import Image
import statistics, os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lin(c):
    c=c/255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def Y(c): return 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2])
def ratio(a,b):
    ya,yb=Y(a),Y(b)
    if ya<yb: ya,yb=yb,ya
    return (ya+0.05)/(yb+0.05)
def med(im,box):
    z=im.crop(box); px=list(z.getdata())
    return tuple(int(statistics.median([p[k] for p in px])) for k in range(3))
C=ouvrir('../capture-1080x2400.png')
print("CP blanc/noir  = %.2f:1 (attendu 21,00)"%ratio((255,255,255),(0,0,0)))
print("CN gris/gris   = %.2f:1 (attendu 1,00)"%ratio((119,119,119),(119,119,119)))
fond=med(C,(700,640,900,700)); print("fond de carte (mediane x700..900 y640..700) =",fond)
print()
cas=[("'LA VITRINE' (grand, capitale 35 px)",(217,171,78),med(C,(750,270,900,310))),
     ("'0 jetons' (grand, capitale 38 px)",(224,102,73),med(C,(150,380,380,430))),
     ("ligne d'alerte (petit, 15 px)",(224,102,73),med(C,(150,450,300,480))),
     ("titre de carte 'Pack - 100 Marks'",(234,224,200),fond),
     ("'en boutique' (petit)",(185,173,146),fond),
     ("'donne 100 jetons' (petit)",(185,173,146),fond),
     ("'+20 % de jetons par euro' (petit)",(217,171,77),med(C,(500,1085,900,1130))),
     ("'DERRIERE LA VITRE' (capitale 23 px)",(119,119,119),med(C,(150,760,330,800))),
     ("'aucun verificateur...' (petit, 12 px)",(185,173,146),med(C,(60,805,120,835)))]
for nom,enc,fnd in cas:
    r=ratio(enc,fnd)
    print("   %-40s encre%s sur fond%s  ->  %5.2f:1" % (nom,enc,fnd,r))
