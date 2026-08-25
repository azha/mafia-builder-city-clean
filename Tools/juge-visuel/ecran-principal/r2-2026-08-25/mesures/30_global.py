# -*- coding: utf-8 -*-
"""Couche globale : luminance moyenne par zone de chrome (echantillonnage 1/4 en x et y),
et debordement des valeurs de la fiche hors de leur cellule."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def lum(p): return sum(p)/3.0

def zone(path,label,zones):
    im=open_img(path); c=css(im); px=im.load()
    for nom,(x0,y0,x1,y1) in zones:
        L=[lum(px[x,y]) for y in range(int(y0*c),int(y1*c),4) for x in range(int(x0*c),int(x1*c),4)]
        m=statistics.median(L)
        enc=100.*sum(1 for v in L if v>m+25)/len(L)
        print(f"  {label:6s} {nom:9s} luminance moyenne={statistics.mean(L):6.1f} mediane={m:6.1f} part d'encre claire={enc:5.1f}%")

zone(CANON,'canon',[('bandeau',(0,0,392,51)),('fiche',(13,427,379,594)),('dock',(1,606,391,690))])
zone(CAP16,'cap16',[('bandeau',(0,0,392,50)),('fiche',(12,426,380,595)),('dock',(1,605,391,689))])
zone(CAP24,'cap24',[('bandeau',(0,0,392,50)),('fiche',(12,600,380,769)),('dock',(1,780,391,863))])

print()
print("== valeurs de la fiche : encre par CELLULE ==")
def cells(path,label,yfil,ycss):
    im=open_img(path); c=css(im); px=im.load()
    bg=med_window(im,int(20*c),yfil+int(80*c),3)
    for i,(a,b) in enumerate([(30,140.67),(140.67,251.33),(251.33,362)]):
        cols=cols_with_ink(im,int(a*c),yfil+int(ycss[0]*c),int(b*c),yfil+int(ycss[1]*c),bg,26)
        cr=runs(cols, lambda n:n>0)
        if not cr: print(f"    {label} cellule {i+1}: vide"); continue
        x0,x1=cr[0][0]/c,(cr[-1][1]+1)/c
        print(f"    {label} cellule {i+1} [{a:.1f},{b:.1f}] : encre x[{x0:.2f},{x1:.2f}] larg={x1-x0:.2f} centre={((x0+x1)/2):.2f} (theorique {(a+b)/2:.2f}) marges G={x0-a:.2f} D={b-x1:.2f}")
cells(CANON,'canon',1280,(68,81))
cells(CAP16,'cap16',1172,(69,86))
