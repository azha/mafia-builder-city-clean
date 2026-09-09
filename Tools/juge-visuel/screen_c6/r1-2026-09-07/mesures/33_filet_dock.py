# -*- coding: utf-8 -*-
"""Filet du bandeau et dock, sondes CIBLEES et scopees (la sonde large du script 32 attrapait,
sur la capture, le bord OR de l'enseigne de l'ecran a y=279 : hors bandeau).
Portee : filet cherche uniquement dans y<200 ; couleur echantillonnee HORS du medaillon (x=100..300).
Dock repere par ses LIBELLES (bande d'encre la plus basse), pas par la luminance (le canon a de l'art
sous le dock).
ATTENTION : le PNG canon porte des PASTILLES d'annotation numerotees (1..6) qui ne sont PAS de l'UI.
CONTROLE POSITIF : le filet doit exister dans les deux images (couverture >= 60 % de la largeur).
CONTROLE NEGATIF : la meme recherche sur la capture ECRAN SEUL (hors shell) doit rendre AUCUN filet."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def chaud(p):
    r,g,b=p; return r>=110 and (r-b)>=40
def med(im,x0,y0,x1,y1):
    px=im.load(); ch=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): ch[i].append(p[i])
    return tuple(sorted(c)[len(c)//2] for c in ch)
def hexa(c): return "#%02x%02x%02x"%c
for f,S,tag in (("hud-canon-1176.png",3.000,"CANON HUD"),
                ("capture-1080x2400.png",2.755,"CAPTURE sous shell"),
                ("capture-ecran-seul-etat-vide-1080x2400.png",2.755,"CTRL NEG ecran seul")):
    im=Image.open(os.path.join(R,f)).convert("RGB"); px=im.load(); w,h=im.size
    print("\n### %-22s %s  x%.3f" % (tag,im.size,S))
    best=None
    for y in range(80,200):
        n=sum(1 for x in range(0,w,2) if chaud(px[x,y]))
        if best is None or n>best[1]: best=(y,n)
    y,n=best; cov=2.0*n/w
    print("  filet : y=%4d = %5.1f CSS-HUD | couverture %.0f%% | couleur hors medaillon %s"
          % (y,y/S,100*cov,hexa(med(im,100,y,300,y+1)) if cov>0.3 else "-"))
    # dock : derniere bande d'encre
    bandes=[];cur=None
    for yy in range(int(h*0.80),h):
        k=sum(1 for x in range(0,w,2) if lum(px[x,yy])>75)
        if k>=6:
            if cur is None: cur=[yy,yy]
            else: cur[1]=yy
        else:
            if cur: bandes.append(tuple(cur)); cur=None
    if cur: bandes.append(tuple(cur))
    print("  bandes d'encre du bas :", bandes[-4:] if bandes else "AUCUNE")
    if bandes:
        a,b=bandes[-1]
        print("        derniere ligne (libelles du dock) y=%d..%d ; bas de l'image a %d px = %.1f CSS-HUD" % (a,b,h-b,(h-b)/S))
