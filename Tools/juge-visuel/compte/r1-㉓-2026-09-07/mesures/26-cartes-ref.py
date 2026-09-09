# -*- coding: utf-8 -*-
"""26 - Bbox des cartes .art de la reference, par la TEINTE (le fond de carte est prune #221a20,
le plateau est bleute #151b23) : on classe chaque pixel par le signe de (R - B).
CONTROLE POSITIF : le plateau doit rendre R-B < 0 et la carte R-B > 0 -> le critere discrimine.
CONTROLE NEGATIF : le meme critere sur la CAPTURE (fond neutre 13,13,13) doit rendre R-B = 0."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
R=ouvrir('../reference-㉓-1080x2102.png'); C=ouvrir('../capture-1080x2400.png')
pr=R.load(); pc=C.load()
print("   CP  plateau (100,640)  R-B = %d"%(pr[100,640][0]-pr[100,640][2]))
print("   CP  carte   (100,760)  R-B = %d"%(pr[100,760][0]-pr[100,760][2]))
print("   CN  capture (100,760)  R-B = %d"%(pc[100,760][0]-pc[100,760][2]))
print()
def bandes(px,x,y0,y1):
    s=[];deb=None
    for y in range(y0,y1):
        v=(px[x,y][0]-px[x,y][2])>1
        if v and deb is None: deb=y
        if not v and deb is not None:
            if y-deb>=10: s.append((deb,y-1,y-deb))
            deb=None
    if deb is not None: s.append((deb,y1-1,y1-deb))
    return s
print("   REF colonne 1 (x=100) : cartes en y =",bandes(pr,100,600,1830))
print("   REF colonne 2 (x=600) : cartes en y =",bandes(pr,600,600,1830))
def cols(px,y,x0,x1):
    s=[];deb=None
    for x in range(x0,x1):
        v=(px[x,y][0]-px[x,y][2])>1
        if v and deb is None: deb=x
        if not v and deb is not None:
            if x-deb>=10: s.append((deb,x-1,x-deb))
            deb=None
    if deb is not None: s.append((deb,x1-1,x1-deb))
    return s
print("   REF a y=760 : cartes en x =",cols(pr,760,20,1070))
