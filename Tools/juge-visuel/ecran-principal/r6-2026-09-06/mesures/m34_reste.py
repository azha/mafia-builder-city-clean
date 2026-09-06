from lib import *
import math
def find_text(im,x0,y0,x1,y1,s,label,rel=0.6):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(ls); bg=srt[len(srt)//2]; pk=srt[-max(1,len(srt)//200)]
    thr=bg+rel*(pk-bg)
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(im.getpixel((x,y)))>=thr]
    if not pts: print(f"    {label}: RIEN"); return
    X0,X1,Y0,Y1=min(p[0] for p in pts),max(p[0] for p in pts),min(p[1] for p in pts),max(p[1] for p in pts)
    inks=sorted(pts,key=lambda p:-lum(im.getpixel(p)))[:max(6,len(pts)//5)]
    ink=tuple(int(median([im.getpixel(p)[k] for p in inks])) for k in range(3))
    outs=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if not(X0-4<=x<=X1+4 and Y0-4<=y<=Y1+4)]
    bgc=tuple(int(median([im.getpixel(p)[k] for p in outs])) for k in range(3)) if outs else (0,0,0)
    darks=sorted([(x,y) for y in range(Y0,Y1+1) for x in range(X0,X1+1)],key=lambda p:lum(im.getpixel(p)))[:max(4,len(pts)//10)]
    dk=tuple(int(median([im.getpixel(p)[k] for p in darks])) for k in range(3))
    print(f"    {label}: CSS x {X0/s:.2f}..{X1/s:.2f} y {Y0/s:.2f}..{Y1/s:.2f} h={(Y1-Y0+1)/s:.2f}"
          f" | encre {ink} fond {bgc} contour {dk} | encre/fond {contrast(ink,bgc):.2f}:1  contour/fond {contrast(dk,bgc):.2f}:1")
c=load(CAP19); r=load(REF); c24=load(CAP24)
print("== nom de district 1920 ==")
find_text(c,20,230,340,270,S_CAP,'JEU 1920 « La Lisiere »')
print("== fiche : titre / sous-titre, contraste sur le panneau ==")
find_text(c,86,1224,994,1264,S_CAP,'JEU 1920 titre')
find_text(r,300,1336,800,1376,S_REF,'REF titre')
find_text(c,86,1288,994,1320,S_CAP,'JEU 1920 sous-titre')
find_text(r,340,1405,820,1440,S_REF,'REF sous-titre')
print("== manometre : libelles ==")
find_text(c,380,190,700,260,S_CAP,'JEU 1920 « Brulant »')
find_text(c,380,262,700,310,S_CAP,'JEU 1920 « CHALEUR »')
find_text(r,470,300,720,360,S_REF,'REF « 37% »')
find_text(r,470,420,720,470,S_REF,'REF « HEAT »')
