# -*- coding: utf-8 -*-
"""08 - Le filet du bandeau : profil transversal, compare au canon HUD (etat CALME, laiton)
et a la regle CSS .tel.chaud (braise #e0664a, degrade transparent->18%->82%->transparent).
CONTROLE POSITIF : sur le canon HUD (laiton #b08d3e), le plateau central doit retrouver le laiton
a <=6/255 -> si l'instrument echoue LA, il n'est pas opposable ailleurs.
CONTROLE NEGATIF : une ligne 6 px au-dessus du filet doit rendre le fond, pas le filet."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-28s %s"%(os.path.basename(p),im.size)); return im
C=ouvrir('../capture-1080x2400.png'); H=ouvrir('../hud-canon-1176.png')
pc=C.load(); ph=H.load()

print()
print("--- CAPTURE 1080 : filet y=141, profil transversal ---")
for f in [0.02,0.05,0.09,0.18,0.25,0.30,0.35,0.65,0.70,0.75,0.82,0.90,0.95,0.98]:
    x=int(f*1080)
    print("   x=%4d (%.0f %%)  %s" % (x,f*100,pc[x,141]))
print("   CN  y=135 x=300 (6 px au-dessus) :", pc[300,135])

print()
print("--- CANON HUD 1176 : localiser le filet laiton ---")
def L(px,x,y):
    r,g,b=px[x,y];return 0.2126*r+0.7152*g+0.0722*b
best=None
for y in range(140,200):
    v=sum(L(ph,x,y) for x in range(300,800))/500
    if best is None or v>best[1]: best=(y,v)
print("   ligne la plus claire entre y=140..200 (x 300..800) : y=%d L=%.1f"%best)
yb=best[0]
for f in [0.02,0.09,0.18,0.30,0.50,0.70,0.82,0.95]:
    x=int(f*1176)
    print("   x=%4d (%.0f %%)  %s" % (x,f*100,ph[x,yb]))
print("   CP  laiton attendu #b08d3e = (176,141,62)")
