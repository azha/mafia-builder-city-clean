# -*- coding: utf-8 -*-
"""Volutes ornementales : zones NON contaminees par le texte.
   gauche : CSS x[5,15]  droite : CSS x[377,390], y[18,34].
   Controle positif : le canon DOIT y trouver de l'encre (l'ornement y est)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def zone(path,label,x0,x1,y0,y1,bg,thr=40):
    im=open_img(path); c=css(im); px=im.load()
    n=0; mx=0; sample=None
    for y in range(int(y0*c),int(y1*c)):
        for x in range(int(x0*c),int(x1*c)):
            p=px[x,y]; d=abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2])
            if d>thr:
                n+=1
                if d>mx: mx=d; sample=p
    tot=(int(y1*c)-int(y0*c))*(int(x1*c)-int(x0*c))
    print(f"  {label:12s} CSS x[{x0},{x1}] y[{y0},{y1}] : encre {n}/{tot} = {100.*n/tot:5.1f}%  dmax={mx} pic={hexc(sample) if sample else '-'}")

BG_CANON=(17,24,36); BG16=(55,61,72); BG24=(16,20,31)
print("== VOLUTE GAUCHE ==")
zone(CANON,'canon',5,15,18,34,BG_CANON)
zone(CAP16, 'cap16',5,15,18,34,BG16)
zone(CAP24, 'cap24',5,15,18,34,BG24)
print("== VOLUTE DROITE ==")
zone(CANON,'canon',377,390,18,34,BG_CANON)
zone(CAP16, 'cap16',377,390,18,34,BG16)
zone(CAP24, 'cap24',377,390,18,34,BG24)
print("== CONTROLE NEGATIF : zone vide du bandeau (CSS x[140,160] y[10,20]) ==")
zone(CANON,'canon',140,160,10,20,BG_CANON)
zone(CAP16, 'cap16',140,160,10,20,BG16)
zone(CAP24, 'cap24',140,160,10,20,BG24)
print("== BOUTON RETOUR (capture) CSS x[25,45] y[18,34] ==")
zone(CANON,'canon',25,45,18,34,BG_CANON)
zone(CAP16, 'cap16',25,45,18,34,BG16)
zone(CAP24, 'cap24',25,45,18,34,BG24)
