# -*- coding: utf-8 -*-
"""06 - Palette globale + fonds. Histogramme quantifie (PIL seul) + medianes de fenetres.
CONTROLE POSITIF : la mediane d'une fenetre de fond de la reference doit etre reproductible
sur deux fenetres disjointes du meme aplat (ecart <= 2/255).
CONTROLE NEGATIF : deux fenetres prises sur des aplats DIFFERENTS (fond vs bandeau or) doivent differer."""
from PIL import Image
import os, statistics

def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s" % (os.path.basename(p), im.size)); return im

def palette(im, n=8, zone=None):
    z = im.crop(zone) if zone else im
    q = z.convert('RGB').quantize(colors=n, method=Image.MEDIANCUT)
    pal = q.getpalette()[:n*3]
    tot = z.size[0]*z.size[1]
    cnt = sorted(q.getcolors(), reverse=True)
    out=[]
    for c,i in cnt:
        out.append((round(100.0*c/tot,1), tuple(pal[i*3:i*3+3])))
    return out

def med(im, x0,y0,x1,y1):
    z=im.crop((x0,y0,x1,y1)); px=list(z.getdata())
    return tuple(int(statistics.median([p[k] for p in px])) for k in range(3))

def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

R=ouvrir('../reference-㉓-1080x2102.png')
C=ouvrir('../capture-1080x2400.png')
P=ouvrir('../capture-planche-1080x2400.png')

print()
print("=== PALETTE (8 couleurs, % d'aire) ===")
print("REFERENCE, zone PANNEAU (y 434..2090) :")
for p,c in palette(R,8,(10,434,1070,2090)): print("   %5.1f %%  rgb%s  L=%.0f" % (p,c,lum(c)))
print("CAPTURE, zone CONTENU (y 200..2160, entre bandeau et dock) :")
for p,c in palette(C,8,(10,200,1070,2160)): print("   %5.1f %%  rgb%s  L=%.0f" % (p,c,lum(c)))

print()
print("=== FONDS (medianes de fenetres) ===")
print("REF  fond du panneau (x 40..80, y 1200..1250)      :", med(R,40,1200,80,1250))
print("REF  fond du panneau (x 990..1030, y 1200..1250)   :", med(R,990,1200,1030,1250), " <- CP meme aplat")
print("REF  bande brune du compt (x 40..80, y 445..465)   :", med(R,40,445,80,465), " <- CN autre aplat")
print("REF  fond d'une carte 'art' (x 100..140,y 720..760):", med(R,100,720,140,760))
print("CAP  fond d'ecran (x 20..50, y 600..660)           :", med(C,20,600,50,660))
print("CAP  fond d'ecran (x 1030..1060, y 600..660)       :", med(C,1030,600,1060,660), " <- CP meme aplat")
print("CAP  fond d'une carte (x 100..140, y 960..1000)    :", med(C,100,960,140,1000))
print("CAP  bandeau (x 300..340, y 20..60)                :", med(C,300,20,340,60))
print("REF  bandeau (x 300..340, y 20..60)                :", med(R,300,20,340,60))
print("CAP  dock (x 20..60, y 2300..2340)                 :", med(C,20,2300,60,2340))
print()
print("=== LUMINANCE MOYENNE de la zone contenu ===")
def Lmoy(im,box):
    z=im.crop(box).resize((108,int((box[3]-box[1])/10)),Image.BILINEAR)
    d=list(z.getdata()); return sum(lum(p) for p in d)/len(d)
print("REF  panneau  L=%.2f" % Lmoy(R,(10,434,1070,2090)))
print("CAP  contenu  L=%.2f" % Lmoy(C,(10,200,1070,2160)))
