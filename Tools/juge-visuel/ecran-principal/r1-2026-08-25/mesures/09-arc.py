# -*- coding: utf-8 -*-
"""Arc du manometre: rayon, etendue angulaire des zones froide/chaude, couleurs; aiguille."""
import math
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')

def radial(im,cx,cy,ang,rmax,tag):
    px=im.load(); rad=math.radians(ang)
    out=[]
    for r in range(4,rmax):
        x=cx+r*math.sin(rad); y=cy-r*math.cos(rad)
        out.append((r,px[int(round(x)),int(round(y))]))
    print(f"  [{tag}] radial depuis ({cx},{cy}) a {ang:+d}deg :")
    print("      "+"  ".join(f"{r}:{c}" for r,c in out if r%3==0))

print("\n### CANON : moyeu (588,131) ###")
radial(K,588,131,-45,80,'canon -45')
radial(K,588,131,45,80,'canon +45')
print("\n### CAPTURE : moyeu (540,90) ###")
radial(C,540,90,-45,80,'c19 -45')
radial(C,540,90,45,80,'c19 +45')
