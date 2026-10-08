#!/usr/bin/env python3
"""m3 — VIGNETTE du liege (inset 0 0 60px #00000055) : moyenne locale 9x9 du canal R le long d'une ligne sans contenu, x = 8..540.
La vignette = baisse de la moyenne vers le bord. Imprime tailles."""
from PIL import Image
REF="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference/"
CAP="/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final/"
def ligne(p,y,label):
    im=Image.open(p).convert("RGB"); px=im.load()
    def m(x):
        v=[px[xx,yy][0] for yy in range(y-4,y+5) for xx in range(x-4,x+5)]; return sum(v)/len(v)
    xs=[12,30,60,120,240,540]; vals=[m(x) for x in xs]
    print(f"{label:30s} {im.size} y={y}  "+"  ".join(f"x{x}:{v:.0f}" for x,v in zip(xs,vals))+f"   bord->centre = {vals[-1]-vals[0]:+.0f}")
ligne(REF+"E09-cadre-33-signalement.png",1900,"REF c33 liege (bas)")
ligne(REF+"E09-cadre-33-signalement.png",1700,"REF c33 liege (haut)")
ligne(CAP+"E09_Inspections_1080x2400.png",1500,"JEU E09 2400")
ligne(CAP+"E09_Inspections_1080x1920.png",1100,"JEU E09 1920")
