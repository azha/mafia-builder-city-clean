# -*- coding: utf-8 -*-
"""07 - Reperes : bandeau, dock, plateau, et decoupage vertical des deux images.
CONTROLE POSITIF : la largeur du filet de bandeau de la capture doit couvrir toute la largeur (1080).
CONTROLE NEGATIF : la meme sonde sur une ligne de fond doit rendre une couverture ~0."""
from PIL import Image
import statistics, os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
R=ouvrir('../reference-㉓-1080x2102.png'); C=ouvrir('../capture-1080x2400.png'); P=ouvrir('../capture-planche-1080x2400.png')
def L(px,x,y):
    r,g,b=px[x,y]; return 0.2126*r+0.7152*g+0.0722*b

def couverture(im,y,seuil):
    px=im.load(); n=sum(1 for x in range(0,1080) if L(px,x,y)>seuil); return n

print()
print("--- CAPTURE : filet du bandeau (cherche la ligne rouge/braise pleine largeur) ---")
px=C.load()
for y in range(130,160):
    r,g,b = px[540,y]
    print("   y=%d  rgb(%3d,%3d,%3d)  couverture(L>25)=%4d" % (y,r,g,b,couverture(C,y,25)))

print()
print("--- CAPTURE : filet du bandeau, echantillonne HORS medaillon (x=100) ---")
px=C.load()
for y in range(136,150):
    print("   y=%d  x=100 rgb%s   x=980 rgb%s   couverture(L>25)=%d" % (y,px[100,y],px[980,y],couverture(C,y,25)))
print()
print("--- CANON HUD : filet du bandeau (1176 px de large, x3) ---")
H=ouvrir('../hud-canon-1176.png'); ph=H.load()
def couvH(y,seuil=25):
    return sum(1 for x in range(0,1176) if L(ph,x,y)>seuil)
for y in range(150,185):
    c=couvH(y)
    if c>900: print("   y=%d  x=100 rgb%s  couverture=%d" % (y,ph[100,y],c))
print()
print("--- CAPTURE : bord haut du DOCK (couverture d'un fond bleu-nuit pleine largeur) ---")
for y in range(2100,2200):
    r,g,b=px[20,y]
    if b-r>4:
        print("   1er y ou le fond devient bleute a x=20 : y=%d rgb(%d,%d,%d)"%(y,r,g,b)); break
for y in [2120,2125,2128,2130,2135,2140,2145,2150,2160,2170]:
    print("   y=%4d  x=20 rgb%s  x=540 rgb%s  x=1060 rgb%s" % (y,px[20,y],px[540,y],px[1060,y]))
