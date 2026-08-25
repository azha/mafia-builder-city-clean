# -*- coding: utf-8 -*-
"""(a) 'JOUR' : chasse+tracking compares sur le MEME mot
   (b) pastille de notification du dock (canon : .disc 8px or en haut-a-droite de FAMILLE)
   (c) hauteur de capitale du 'L' de 'Lab' vs capitales du canon
   (d) nom de district dans la capture 2400"""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def mot(path,label,x0,x1,y0,y1,bg,nlet=4):
    im=open_img(path); c=css(im); px=im.load()
    xa,xb,ya,yb=int(x0*c),int(x1*c),int(y0*c),int(y1*c)
    cols=cols_with_ink(im,xa,ya,xb,yb,bg,24)
    cr=[r for r in runs(cols, lambda n:n>0)]
    rows=rows_with_ink(im,xa,ya,xb,yb,bg,24)
    rr=runs(rows, lambda n:n>0)
    h=(rr[-1][1]-rr[0][0]+1)/c if rr else 0
    print(f"  {label}: {len(cr)} blocs ; hauteur d'encre={h:.2f}CSS")
    for i,(u,v) in enumerate(cr[:nlet+2]):
        g=(v-u+1)/c
        gap=(u-cr[i-1][1]-1)/c if i>0 else None
        print(f"     lettre {i+1}: x CSS[{u/c:.2f},{(v+1)/c:.2f}] chasse={g:.2f}" + (f"  gouttiere avant={gap:.2f}" if gap is not None else ""))
    if len(cr)>=nlet:
        larg=(cr[nlet-1][1]-cr[0][0]+1)/c
        print(f"     -> largeur des {nlet} premieres lettres = {larg:.2f} CSS ; rapport largeur/hauteur = {larg/h:.3f}")

print("== 'JOUR' (aile droite) ==")
mot(CANON,'canon JOUR',277,320,12,22,(17,24,36))
mot(CAP16, 'cap16 JOUR',347,372,8,18,(55,61,72))
mot(CAP24, 'cap24 JOUR',347,372,8,18,(16,20,31))
print()
print("== 'ARGENT' ==")
mot(CANON,'canon ARGENT',15,60,9,18,(17,24,36),6)
mot(CAP16, 'cap16 ARGENT',62,105,8,18,(55,61,72),6)
print()
print("== 'FAMILLE' (dock) ==")
mot(CANON,'canon FAMILLE',140,183,669,679,(16,22,31),7)
mot(CAP16, 'cap16 FAMILLE',140,184,668,677,(43,71,85),7)
print()
print("== pastille de notification (canon : or 8px, coin haut-droit du rond FAMILLE ~x 178-186, y 613-621) ==")
for p,l,ycss in ((CANON,'canon',(610,624)),(CAP16,'cap16',(610,624)),(CAP24,'cap24',(783,797))):
    im=open_img(p); c=css(im); px=im.load()
    n=0; sm=None
    for y in range(int(ycss[0]*c),int(ycss[1]*c)):
        for x in range(int(172*c),int(192*c)):
            q=px[x,y]
            if q[0]-q[2]>60 and q[0]>150: n+=1; sm=q
    print(f"   {l}: {n} px 'or' dans la zone de la pastille  {hexc(sm) if sm else ''}")
print()
print("== 'Lab' : hauteur du 'L' seul ==")
mot(CAP16,'cap16 Lab',178,214,442,460,(20,27,39),3)
mot(CANON,'canon LE (titre)',124,150,444,458,(15,23,36),2)
print()
print("== nom de district, capture 2400 : balayage de lignes ==")
im=open_img(CAP24); c=css(im); px=im.load()
bg=med_window(im,int(15*c),int(66*c),3)
print("   fond de la bande :",hexc(bg))
rows=rows_with_ink(im,int(3*c),int(52*c),int(120*c),int(78*c),bg,20)
for (a,b) in runs(rows, lambda n:n>2):
    cols=cols_with_ink(im,int(3*c),a,int(120*c),b+1,bg,20)
    cr=runs(cols,lambda n:n>0)
    print(f"   y CSS[{a/c:.2f},{(b+1)/c:.2f}] h={(b-a+1)/c:.2f} x CSS[{cr[0][0]/c:.2f},{(cr[-1][1]+1)/c:.2f}]")
