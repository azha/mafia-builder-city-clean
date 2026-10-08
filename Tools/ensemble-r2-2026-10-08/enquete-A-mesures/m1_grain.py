#!/usr/bin/env python3
"""m1 — le GRAIN existe-t-il dans le jeu ? Patch 2D (pas une ligne : un point de 8 px tous les 32 px se loupe a l'echantillonnage).
Imprime la taille des images lues. Metrique : (p1, p50, p99, max-min) des canaux R sur un patch de 360x360 px, et
nombre de pixels s'ecartant de > 4/255 de la mediane. Controle positif : la maquette (cadre 54 / 33) DOIT montrer du grain."""
from PIL import Image
import statistics
REF="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference/"
CAP="/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final/"
def patch(path,x0,y0,w=360,h=360,label=""):
    im=Image.open(path).convert("RGB"); px=im.load()
    v=[px[x,y][0] for y in range(y0,y0+h) for x in range(x0,x0+w)]
    s=sorted(v); med=s[len(s)//2]
    n4=sum(1 for a in v if abs(a-med)>4)
    print(f"{label:34s} {im.size} patch({x0},{y0},{w}x{h}) med={med} p1={s[len(s)//100]} p99={s[len(s)*99//100]} min={s[0]} max={s[-1]} ecart>4: {100*n4/len(v):.1f}%")
patch(REF+"E04-cadre-54.png",300,900,label="REF c54 kraft (champ)")
patch(REF+"E09-cadre-33-signalement.png",300,1700,label="REF c33 liege (bas)")
patch(CAP+"E04_Distribution_1080x2400.png",300,1500,label="JEU E04 2400 kraft nu")
patch(CAP+"E04_Distribution_1080x1920.png",300,1100,label="JEU E04 1920 kraft nu")
patch(CAP+"E09_Inspections_1080x2400.png",300,1300,label="JEU E09 2400 liege nu")
patch(CAP+"E09_Inspections_1080x1920.png",300,1000,label="JEU E09 1920 liege nu")
