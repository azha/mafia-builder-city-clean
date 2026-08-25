# -*- coding: utf-8 -*-
"""(a) contraste des libelles du dock, fond mesure HORS glyphes (2 CSS px au-dessus
       et au-dessous de la boite d'encre) — methode tenue identique sur les 3 images
   (b) arc du cadran : balayage angulaire a rayon fixe, couleur par secteur"""
import sys, os, math, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def lum(p): return sum(p)/3.0

def dock_ct(path,label,ylab,cells):
    im=open_img(path); c=css(im); px=im.load()
    y0,y1=int(ylab[0]*c),int(ylab[1]*c)
    for nom,(a,b) in cells:
        vals=[px[x,y] for y in range(y0,y1) for x in range(int(a*c),int(b*c))]
        lums=sorted(lum(q) for q in vals)
        E=[q for q in vals if lum(q)>=lums[int(len(lums)*0.93)]]
        # fond : bandes 2..5 CSS au-dessus et au-dessous
        F=[px[x,y] for y in list(range(y0-int(5*c),y0-int(2*c)))+list(range(y1+int(2*c),y1+int(5*c)))
                    for x in range(int(a*c),int(b*c))]
        e=(int(statistics.median([q[0] for q in E])),int(statistics.median([q[1] for q in E])),int(statistics.median([q[2] for q in E])))
        f=(int(statistics.median([q[0] for q in F])),int(statistics.median([q[1] for q in F])),int(statistics.median([q[2] for q in F])))
        k=contrast(e,f)
        print(f"    {label} {nom:9s} encre={hexc(e)} fond(hors glyphes)={hexc(f)} -> {k:5.2f}:1  {'OK' if k>=4.5 else '*** < 4.5 ***'}")

print("== (a) CONTRASTE DES LIBELLES DU DOCK (fond mesure hors glyphes) ==")
dock_ct(CANON,'canon',(670.67,677.33),[('EMPIRE',(75,112)),('FAMILLE',(141,182)),('MARCHE',(209,250)),('PLUS',(285,310))])
dock_ct(CAP16,'cap16',(669.30,675.84),[('ACCUEIL',(73,115)),('FAMILLE',(141,183)),('FILIERE',(211,249)),('PLUS',(286,310))])
dock_ct(CAP24,'cap24',(843.53,850.06),[('ACCUEIL',(73,115)),('FAMILLE',(141,183)),('FILIERE',(211,249)),('PLUS',(286,310))])

print()
print("== (b) ARC DU CADRAN : balayage angulaire ==")
def arc(path,label,cx,cy,rays):
    im=open_img(path); c=css(im); px=im.load()
    for r in rays:
        out=[]
        for deg in range(180,361,10):
            a=math.radians(deg)
            x=int((cx+r*math.cos(a))*c); y=int((cy+r*math.sin(a))*c)
            out.append(f"{deg-180:3d}:{hexc(px[x,y])}")
        print(f"  {label} r={r}CSS : "+" ".join(out))
arc(CANON,'canon',195.83,44.5,[13,15,17])
arc(CAP16,'cap16',195.82,45.0,[13,15,17,19])
