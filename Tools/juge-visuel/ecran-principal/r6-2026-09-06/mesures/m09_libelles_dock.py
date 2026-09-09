# m09 — libelles du dock : chasse (largeur d'encre), capitale, centre
from lib import *
def ink(im,x0,y0,x1,y1,s,label):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(ls); bg=srt[len(srt)//6]; pk=srt[-max(1,len(srt)//80)]
    thr=bg+0.5*(pk-bg)
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(im.getpixel((x,y)))>=thr: xs.append(x);ys.append(y)
    if not xs: print(f"    {label}: RIEN"); return None
    X0,X1,Y0,Y1=min(xs),max(xs)+1,min(ys),max(ys)+1
    print(f"    {label:22s} CSS x {X0/s:7.2f}..{X1/s:7.2f} (chasse {(X1-X0)/s:6.2f}) "
          f"y {Y0/s:7.2f}..{Y1/s:7.2f} (capitale {(Y1-Y0)/s:5.2f}) centre x={(X0+X1)/2/s:7.2f}  n={len(xs)}")
    return dict(w=(X1-X0)/s,h=(Y1-Y0)/s,cx=(X0+X1)/2/s,y0=Y0/s,y1=Y1/s)

print("== m09 libelles du dock ==")
r=load(REF)
print("  REFERENCE (y 2004..2040 px)")
for nm,(xa,xb) in [('EMPIRE',(210,360)),('FAMILLE',(400,570)),('MARCHE',(600,780)),('PLUS',(830,960))]:
    ink(r,xa,2004,xb,2040,S_REF,f'{nm} ref')
print()
for p,nm,ybase in [(CAP19,'jeu 1080x1920',(1838,1872)),(CAP24,'jeu 1080x2400',(2318,2352))]:
    im=load(p)
    print(f"  {nm} (y {ybase[0]}..{ybase[1]} px)")
    for lb,(xa,xb) in [('EMPIRE',(190,330)),('FAMILLE',(365,520)),('FILIERE',(550,710)),('PLUS',(770,900))]:
        ink(im,xa,ybase[0],xb,ybase[1],S_CAP,f'{lb} jeu')
    print()
