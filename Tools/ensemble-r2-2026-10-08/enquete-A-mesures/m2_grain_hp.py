#!/usr/bin/env python3
"""m2 — GRAIN par filtre passe-haut (pixel moins moyenne 15x15) sur des patchs SANS contenu : ne confond ni le degrade, ni le cadre.
Contre-temoin de l'instrument 05b du juge (profil de ligne a pas de 4 px : il lit le CADRE du kraft, pas le grain).
Imprime la taille des images. p99 = 99e centile de |pixel - moyenne locale| (canal R, /255)."""
from PIL import Image, ImageFilter
import sys
REF="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference/"
CAP="/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final/"
def hp(path,box,label):
    im=Image.open(path).convert("L"); size=im.size
    c=im.crop(box); lo=c.filter(ImageFilter.BoxBlur(7))
    a=c.load(); b=lo.load(); w,h=c.size
    d=sorted(abs(a[x,y]-b[x,y]) for y in range(8,h-8) for x in range(8,w-8))
    print(f"{label:38s} {size} box={box} p50={d[len(d)//2]} p99={d[len(d)*99//100]} max={d[-1]}")
    return d[len(d)*99//100]
r54=hp(REF+"E04-cadre-54.png",(80,640,230,690),"REF c54 kraft (cadre de la planche)")
r33=hp(REF+"E09-cadre-33-signalement.png",(100,1750,500,1990),"REF c33 liege nu")
j4a=hp(CAP+"E04_Distribution_1080x2400.png",(100,1400,500,1700),"JEU E04 2400 kraft nu")
j4b=hp(CAP+"E04_Distribution_1080x1920.png",(100,1000,500,1200),"JEU E04 1920 kraft nu (sous le panneau)")
j9a=hp(CAP+"E09_Inspections_1080x2400.png",(100,1300,500,1700),"JEU E09 2400 liege nu")
j9b=hp(CAP+"E09_Inspections_1080x1920.png",(100,1000,500,1300),"JEU E09 1920 liege nu")
print("\nCONTROLE : un aplat DOIT donner p99=0 :", end=" ")
t=Image.new("L",(200,200),128); lo=t.filter(ImageFilter.BoxBlur(7)); print(max(abs(t.getpixel((x,y))-lo.getpixel((x,y))) for x in range(8,192) for y in range(8,192)))
