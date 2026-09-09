# m22 — panneau .fiche : filet superieur (laiton), bords, hauteur ; puis tete de fiche
# Convention de bord DECLAREE : filet = mi-amplitude du pic de "goldness" (R-B) ;
#   bord lateral du panneau = mi-amplitude du saut de luminance art->panneau.
from lib import *
import math
def goldline(im,xc,y0,y1,s,label):
    vals=[im.getpixel((xc,y))[0]-im.getpixel((xc,y))[2] for y in range(y0,y1)]
    pk=max(vals); i=vals.index(pk); base=median(sorted(vals)[:len(vals)//2])
    thr=base+0.5*(pk-base)
    a=i
    while a>0 and vals[a]>=thr: a-=1
    b=i
    while b<len(vals)-1 and vals[b]>=thr: b+=1
    print(f"    {label}: pic R-B={pk} a y={y0+i} ({(y0+i)/s:.2f} CSS) ; filet y {(y0+a+1)/s:.2f}..{(y0+b)/s:.2f} CSS "
          f"(epaisseur {(b-a-1)/s:.2f} CSS) ; couleur {im.getpixel((xc,y0+i))}")
    return (y0+a+1)/s,(y0+b)/s
print("== m22 filet superieur de la fiche ==")
r=load(REF); c=load(CAP19); c24=load(CAP24)
gr=goldline(r,588,1250,1300,S_REF,'REFERENCE (x=588)')
gc=goldline(c,540,1140,1200,S_CAP,'JEU 1920 (x=540)')
gd=goldline(c24,540,1620,1680,S_CAP,'JEU 2400 (x=540)')

print("\n== bords lateraux du panneau (scan horizontal a mi-hauteur du panneau) ==")
def sides(im,y,x0,x1,s,label):
    vals=[lum(im.getpixel((x,y))) for x in range(x0,x1)]
    # le panneau est SOMBRE ; on cherche les 2 transitions
    inside=median(vals[len(vals)//2-40:len(vals)//2+40])
    outside=median(vals[:15]+vals[-15:])
    thr=(inside+outside)/2
    li=None;ri=None
    for i in range(len(vals)-1):
        if vals[i]>thr>=vals[i+1] and li is None: li=x0+i+ (vals[i]-thr)/(vals[i]-vals[i+1])
    for i in range(len(vals)-1,0,-1):
        if vals[i]>thr>=vals[i-1] and ri is None: ri=x0+i-1+(thr-vals[i-1])/(vals[i]-vals[i-1])
    print(f"    {label}: dedans L={inside:.1f} dehors L={outside:.1f} seuil {thr:.1f}")
    print(f"       bord G {li/s:.2f} CSS   bord D {ri/s:.2f} CSS   LARGEUR {(ri-li)/s:.2f} CSS")
    return li/s,ri/s
sides(r,1500,20,1160,S_REF,'REFERENCE y=1500 (500 CSS)')
sides(c,1320,10,1070,S_CAP,'JEU 1920 y=1320 (479 CSS)')
sides(c24,1800,10,1070,S_CAP,'JEU 2400 y=1800 (653 CSS)')
