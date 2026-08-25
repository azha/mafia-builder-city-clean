# -*- coding: utf-8 -*-
"""Dernier lot : (a) anneau + degrade des ronds du dock, (b) couleurs des 3 valeurs de
la fiche, (c) anneau du medaillon (epaisseur + couleur) et arc du cadran, (d) 'Verge A' en 2400."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def lum(p): return sum(p)/3.0

print("== (a) ANNEAU ET DEGRADE DU 1er ROND DU DOCK ==")
for p,l,(cxr,cyr) in ((CANON,'canon',(94.0,638.7)),(CAP16,'cap16',(94.0,639.9)),(CAP24,'cap24',(93.8,810.5))):
    im=open_img(p); c=css(im); px=im.load()
    y=int(cyr*c)
    prof=[(round((x/c),2), lum(px[x,y]), hexc(px[x,y])) for x in range(int((cxr-26)*c),int((cxr-19)*c))]
    print(f"  {l} profil du bord GAUCHE du rond a mi-hauteur :")
    print("    ", " ".join(f"{a}:{b:.0f}" for a,b,_ in prof))
    fill=med_window(im,int(cxr*c),y,3)
    ring=max(prof,key=lambda t:t[1])
    print(f"    anneau max={ring[1]:.0f} ({ring[2]}) a x={ring[0]}  ; remplissage centre={hexc(fill)} lum={lum(fill):.0f} ; ecart anneau-remplissage={ring[1]-lum(fill):.0f}")
    print(f"    degrade : hg{hexc(med_window(im,int((cxr-11)*c),y-int(11*c),3))} centre{hexc(fill)} bd{hexc(med_window(im,int((cxr+11)*c),y+int(11*c),3))}")

print()
print("== (b) COULEURS DES 3 VALEURS DE LA FICHE ==")
def val(path,label,yfil,cells,ycss):
    im=open_img(path); c=css(im); px=im.load()
    for i,(a,b) in enumerate(cells):
        pts=[]
        for y in range(yfil+int(ycss[0]*c), yfil+int(ycss[1]*c)):
            for x in range(int(a*c),int(b*c)):
                q=px[x,y]; pts.append((lum(q),q))
        pts.sort(key=lambda t:-t[0]); k=max(1,len(pts)//14); top=[q for _,q in pts[:k]]
        col=(int(statistics.median([q[0] for q in top])),int(statistics.median([q[1] for q in top])),int(statistics.median([q[2] for q in top])))
        print(f"    {label} valeur {i+1}: {hexc(col)}")
val(CANON,'canon',1280,[(35,140),(146,246),(252,357)],(68,81))
val(CAP16,'cap16',1172,[(35,140),(146,246),(252,357)],(69,86))
print("    (canon attendu : or-vif #f2c96b / creme #eae0c8 / braise #e0664a)")

print()
print("== (c) ANNEAU DU MEDAILLON : profil horizontal a mi-hauteur ==")
for p,l,ycss in ((CANON,'canon',40.0),(CAP16,'cap16',40.0),(CAP24,'cap24',40.0)):
    im=open_img(p); c=css(im); px=im.load(); W=im.size[0]
    y=int(ycss*c)
    xs=range(int(160*c),int(175*c))
    print(f"  {l} :", " ".join(f"{round(x/c,1)}:{hexc(px[x,y])}" for x in xs))
    lat=[x for x in range(int(155*c),int(200*c)) if px[x,y][0]-px[x,y][2]>50]
    if lat:
        grp=[]
        for x in lat:
            if grp and x<=grp[-1][1]+1: grp[-1][1]=x
            else: grp.append([x,x])
        print(f"    epaisseur de l'anneau (cote gauche) = {[(round((v-u+1)/c,2)) for u,v in grp][:2]} CSS ; couleur={hexc(med_window(im,(grp[0][0]+grp[0][1])//2,y,0))}")

print()
print("== (d) 'Verge A' dans la capture 2400 : balayage y CSS 55..100 ==")
im=open_img(CAP24); c=css(im); px=im.load()
bg=med_window(im,int(60*c),int(60*c),3)
rows=rows_with_ink(im,int(3*c),int(55*c),int(60*c),int(100*c),bg,20)
for (a,b) in runs(rows,lambda n:n>1):
    cols=cols_with_ink(im,int(3*c),a,int(60*c),b+1,bg,20)
    cr=runs(cols,lambda n:n>0)
    print(f"   y CSS[{a/c:.2f},{(b+1)/c:.2f}] h={(b-a+1)/c:.2f} x CSS[{cr[0][0]/c:.2f},{(cr[-1][1]+1)/c:.2f}]")
print("   contraste :")
def ct(im,c,x0,x1,y0,y1):
    px=im.load(); vals=[px[x,y] for y in range(int(y0*c),int(y1*c)) for x in range(int(x0*c),int(x1*c))]
    lums=sorted(lum(q) for q in vals)
    E=[q for q in vals if lum(q)>=lums[int(len(lums)*0.92)]]; F=[q for q in vals if lum(q)<=lums[int(len(lums)*0.4)]]
    e=(int(statistics.median([q[0] for q in E])),int(statistics.median([q[1] for q in E])),int(statistics.median([q[2] for q in E])))
    f=(int(statistics.median([q[0] for q in F])),int(statistics.median([q[1] for q in F])),int(statistics.median([q[2] for q in F])))
    print(f"     encre={hexc(e)} fond={hexc(f)} -> {contrast(e,f):.2f}:1")
ct(im,c,4,40,64,74)
