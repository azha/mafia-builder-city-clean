# -*- coding: utf-8 -*-
"""Textes du medaillon, masque circulaire strict (anneau exclu par construction)."""
import math
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def dansdisque(im,cx,cy,r,y0,y1,tag,ech,S,marge=8):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        dy=y-cy
        if abs(dy)>=r-marge: continue
        demi=math.sqrt((r-marge)**2-dy*dy)
        for x in range(int(cx-demi), int(cx+demi)+1):
            if lum(px[x,y])>S: xs.append(x);ys.append(y)
    if not xs: print(f"  [{tag}] rien>L{S}"); return
    print(f"  [{tag}] cap={(max(ys)-min(ys)+1)/ech:.2f}CSS  l={(max(xs)-min(xs)+1)/ech:.1f}CSS  y {min(ys)}..{max(ys)} x {min(xs)}..{max(xs)}")
EK=3.0; EC=1080/392.0
print("### CANON : disque centre (588,120) r=96 ###")
dansdisque(K,588,120,96,150,200,'canon HEAT',EK,80)
dansdisque(K,588,120,96,128,150,'canon 37% (moitie basse, hors aiguille)',EK,120)
print("### CAPTURE : disque centre (540,103) r=86 ###")
dansdisque(C,540,103,86,146,190,'c19 CHALEUR',EC,80)
dansdisque(C,540,103,86,112,150,'c19 Froid',EC,120)
print("\n### position verticale des textes dans le medaillon (% de la hauteur du disque) ###")
print("  canon : disque y 24..216 (192px). HEAT y 155..166  -> %.1f%%..%.1f%%" % ((155-24)/192*100,(166-24)/192*100))
print("  c19   : disque y 17..189 (172px). CHALEUR y 150..181 -> %.1f%%..%.1f%%" % ((150-17)/172*100,(181-17)/172*100))
