# -*- coding: utf-8 -*-
"""Couleur de l'ENCRE du solde (le seul or du canon) — isolee du bouton retour.
Methode : histogramme des pixels d'encre de la ligne du solde, on garde le decile
le plus eloigne du fond, et on rend la MEDIANE par canal (pas un pixel extreme)."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def ink_color(path,label,xc0,xc1,yc0,yc1,bg):
    im=open_img(path); c=css(im); px=im.load()
    pts=[]
    for y in range(int(yc0*c),int(yc1*c)):
        for x in range(int(xc0*c),int(xc1*c)):
            p=px[x,y]; d=abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2])
            pts.append((d,p))
    pts.sort(key=lambda t:-t[0])
    k=max(1,len(pts)//12)
    top=[p for d,p in pts[:k]]
    R=int(statistics.median([p[0] for p in top])); G=int(statistics.median([p[1] for p in top])); B=int(statistics.median([p[2] for p in top]))
    print(f"  {label:16s} CSS x[{xc0},{xc1}] y[{yc0},{yc1}] : encre mediane du top-decile = {hexc((R,G,B))} rgb({R},{G},{B})  n={len(top)}")
    return (R,G,B)

print("== SOLDE (valeur) ==")
a=ink_color(CANON,'canon $ 24 850',17,80,20,34,(17,24,36))
b=ink_color(CAP16, 'cap16 $10,000',46,140,22,38,(55,61,72))
d=ink_color(CAP24, 'cap24 $10,000',46,140,22,38,(16,20,31))
print(f"    canon vs cap16 : dR={b[0]-a[0]} dG={b[1]-a[1]} dB={b[2]-a[2]}")
print("== CONTROLE POSITIF : libelle ARGENT (doit etre #b9ad92 des deux cotes) ==")
ink_color(CANON,'canon ARGENT',16,59,10,17,(17,24,36))
ink_color(CAP16, 'cap16 ARGENT',64,103,9,17,(55,61,72))
ink_color(CAP24, 'cap24 ARGENT',64,103,9,17,(16,20,31))
print("== CONTROLE : valeur aile droite (canon --creme #eae0c8) ==")
ink_color(CANON,'canon 21:40',330,376,26,40,(17,24,36))
ink_color(CAP16, 'cap16 Aube',339,376,24,37,(55,61,72))
print("== CONTROLE : libelle aile droite ==")
ink_color(CANON,'canon JOUR12',277,376,13,22,(17,24,36))
ink_color(CAP16, 'cap16 JOUR 1',347,376,9,17,(55,61,72))
