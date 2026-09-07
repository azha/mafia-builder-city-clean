# -*- coding: utf-8 -*-
"""16 - (a) le dock de la capture vs le canon HUD ; (b) ce qui separe les DEUX captures.
CONTROLE POSITIF : le canon HUD doit rendre 4 ronds ~138 px (46 CSS x3).
CONTROLE NEGATIF : la meme sonde au-dessus du dock ne doit rien trouver."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
C=ouvrir('../capture-1080x2400.png'); P=ouvrir('../capture-planche-1080x2400.png'); H=ouvrir('../hud-canon-1176.png')

def ronds(im,y,seuil,larg,nom):
    px=im.load(); segs=[];deb=None
    for x in range(larg):
        v=lum(px[x,y])>seuil
        if v and deb is None: deb=x
        if not v and deb is not None:
            if x-deb>=20: segs.append((deb,x-1,x-deb))
            deb=None
    print("   %-24s y=%4d : %d segments %s"%(nom,y,len(segs),[(a,b,n) for a,b,n in segs]))
    return segs
print()
print("--- ronds du dock ---")
ronds(H,905,30,1176,"CANON HUD (CP)")
ronds(C,2245,22,1080,"CAPTURE")
ronds(C,2000,22,1080,"CAPTURE (CN, hors dock)")
print()
print("--- libelles du dock : bbox d'encre ---")
def bbox(im,box,seuil,nom):
    p=im.load();x0,y0,x1,y1=box
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(p[x,y])>seuil]
    if not pts: print("   %-26s : rien"%nom); return
    xs=[q[0] for q in pts];ys=[q[1] for q in pts]
    import statistics
    cols=[p[x,y] for x,y in pts]; cols.sort(key=lum); top=cols[int(len(cols)*.85):]
    c=tuple(int(statistics.median([q[k] for q in top])) for k in range(3))
    print("   %-26s bbox=(%d,%d,%d,%d) h=%d  coeur=%s"%(nom,min(xs),min(ys),max(xs),max(ys),max(ys)-min(ys)+1,c))
bbox(C,(180,2320,330,2360),40,"CAP libelle EMPIRE")
bbox(H,(90,1010,190,1050),40,"CANON libelle EMPIRE")
print()
print("--- difference entre les DEUX captures (par bandes de 100 px) ---")
pc=C.load(); pp=P.load()
for y0 in range(0,2400,100):
    n=0; 
    for y in range(y0,min(y0+100,2400),2):
        for x in range(0,1080,2):
            a=pc[x,y]; b=pp[x,y]
            if abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2])>18: n+=1
    if n: print("   y=%4d..%4d : %5d pixels differents (sur 27000 echantillons)"%(y0,y0+99,n))
