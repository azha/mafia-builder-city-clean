# -*- coding: utf-8 -*-
"""17 - Dock : pas, diametre des ronds, libelles. Tout en % de largeur (echelles differentes).
CONTROLE POSITIF : le PAS des 4 ronds doit valoir le meme % de largeur des deux cotes.
CONTROLE NEGATIF : la meme sonde 300 px plus haut ne doit trouver aucun rond."""
from PIL import Image
import os, statistics
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-24s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
C=ouvrir('../capture-1080x2400.png'); H=ouvrir('../hud-canon-1176.png')
def anneau(im,cx,y0,y1,seuil,nom):
    """diametre vertical du rond : 1re et derniere ligne ou le pixel (cx,y) depasse le fond"""
    px=im.load(); ys=[y for y in range(y0,y1) if lum(px[cx,y])>seuil]
    if not ys: print("   %-26s : rien"%nom); return None
    d=max(ys)-min(ys)+1
    print("   %-26s y=%d..%d  d=%d px = %.2f %% de la largeur"%(nom,min(ys),max(ys),d,100.0*d/im.size[0]))
    return d
print()
print("--- pas des ronds ---")
print("   CANON  centres 266,470,674,878 -> pas 204 px = %.2f %% de 1176"%(100*204/1176))
print("   CAPTURE centres 258,446,633,820 -> pas 187 px = %.2f %% de 1080"%(100*187.5/1080))
print()
print("--- diametre vertical d'un rond ---")
anneau(H,266,1830,2000,26,"CANON rond 1 (CP)")
anneau(C,258,2160,2330,17,"CAPTURE rond 1")
anneau(C,258,1800,1960,17,"CAPTURE (CN, 300 px plus haut)")
print()
def bbox(im,box,seuil,nom):
    p=im.load();x0,y0,x1,y1=box
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(p[x,y])>seuil]
    if not pts: print("   %-30s : rien"%nom); return
    xs=[q[0] for q in pts];ys=[q[1] for q in pts]
    cols=[p[x,y] for x,y in pts]; cols.sort(key=lum); top=cols[int(len(cols)*.85):]
    c=tuple(int(statistics.median([q[k] for q in top])) for k in range(3))
    print("   %-30s bbox=(%d,%d,%d,%d)  h=%d px = %.2f %% larg  coeur=%s"
          %(nom,min(xs),min(ys),max(xs),max(ys),max(ys)-min(ys)+1,100.0*(max(ys)-min(ys)+1)/im.size[0],c))
print("--- libelles ---")
for y0 in range(1930,2010,10):
    b=bbox(H,(190,y0,350,y0+30),45,"CANON y=%d"%y0)
bbox(C,(190,2315,330,2350),45,"CAPTURE EMPIRE")
