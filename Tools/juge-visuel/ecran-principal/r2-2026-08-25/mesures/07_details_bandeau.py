# -*- coding: utf-8 -*-
"""(a) barre de ratio : profil le long de la barre -> part OR / part GRISE
   (b) volutes gauche/droite (ornement, opacite .28)
   (c) aile droite : segmentation fine
   (d) 'ARGENT' : chasse des glyphes vs gouttiere (separe tracking et chasse)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def ratio(path,label,ycss,xa,xb):
    im=open_img(path); c=css(im); px=im.load()
    y=int(ycss*c)
    print(f"  {label} barre de ratio, y={ycss}CSS (px {y}) :")
    seq=[]
    for x in range(int(xa*c),int(xb*c)):
        p=px[x,y]; seq.append((x,p))
    # classer : OR si R-B>60 ; GRIS si |R-B|<25 et lum>60 ; FOND sinon
    cls=[]
    for x,p in seq:
        rb=p[0]-p[2]; lum=sum(p)/3.
        cls.append((x, 'OR' if rb>60 else ('GRIS' if (abs(rb)<30 and lum>55) else '.')))
    # compacter
    out=[]; cur=None
    for x,k in cls:
        if cur and cur[0]==k: cur[2]=x
        else:
            if cur: out.append(tuple(cur))
            cur=[k,x,x]
    out.append(tuple(cur))
    for k,a,b in out:
        if k!='.' and (b-a)>2: print(f"      {k:4s} x=[{a},{b}] w={(b-a+1)/c:.2f}CSS  ({hexc(med_window(im,(a+b)//2,y,1))})")

def volute(path,label,xcss0,xcss1,ycss0,ycss1,bg):
    im=open_img(path); c=css(im); px=im.load()
    n=0; mx=0
    for y in range(int(ycss0*c),int(ycss1*c)):
        for x in range(int(xcss0*c),int(xcss1*c)):
            p=px[x,y]; d=abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2])
            if d>50: n+=1; mx=max(mx,d)
    print(f"  {label} zone volute CSS x[{xcss0},{xcss1}] y[{ycss0},{ycss1}] : {n} px d'encre (dmax={mx})")

print("== barre de ratio ==")
ratio(CANON,'canon',41.5,10,100)
ratio(CAP16,'cap16',43.7,58,145)
ratio(CAP24,'cap24',43.7,58,145)
print()
print("== volutes (ornement) ==")
volute(CANON,'canon G',4,40,18,34,(17,24,36))
volute(CANON,'canon D',352,389,18,34,(17,24,36))
volute(CAP16,'cap16 D',352,389,18,34,(55,61,72))
volute(CAP24,'cap24 D',352,389,18,34,(16,20,31))
volute(CAP24,'cap24 G',4,40,18,34,(16,20,31))
