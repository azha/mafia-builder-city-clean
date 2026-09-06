# m26 — filet du bandeau : scan vertical a PLUSIEURS x, hors barre de ratio et hors medaillon
from lib import *
def scanv(im,xcss,y0,y1,s,label):
    xc=int(xcss*s)
    out=[]
    for y in range(y0,y1):
        c=im.getpixel((xc,y)); out.append((y,c,c[0]-c[2]))
    pk=max(out,key=lambda t:t[2])
    print(f"    {label} x={xcss} CSS : pic R-B={pk[2]} a y={pk[0]}={pk[0]/s:.2f} CSS couleur {pk[1]}")
    # bornes mi-amplitude
    base=median(sorted([t[2] for t in out])[:len(out)//2]); thr=base+0.5*(pk[2]-base)
    i=[t[0] for t in out].index(pk[0]); a=i
    while a>0 and out[a][2]>=thr: a-=1
    b=i
    while b<len(out)-1 and out[b][2]>=thr: b+=1
    print(f"        -> filet y {(out[a][0]+1)/s:.2f}..{out[b][0]/s:.2f} CSS  ep={(out[b][0]-out[a][0]-1)/s:.2f} CSS")
    return pk
print("== m26 filet du bandeau ==")
r=load(REF); c=load(CAP19); d=load(DIS24)
for x in (20,300,350):
    scanv(r,x,130,190,S_REF,'REFERENCE')
print()
for x in (20,300,350):
    scanv(c,x,110,190,S_CAP,'JEU 1920')
print()
print("== barre de ratio : balayage y pour trouver la bande doree la plus large ==")
def findratio(im,x0,x1,y0,y1,s,label):
    best=None
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if (lambda cc:cc[0]-cc[2]>40 and cc[0]>120)(im.getpixel((x,y))))
        if best is None or n>best[1]: best=(y,n)
    y=best[0]
    xs=[x for x in range(x0,x1) if (lambda cc:cc[0]-cc[2]>40 and cc[0]>120)(im.getpixel((x,y)))]
    print(f"    {label}: y={y}={y/s:.2f} CSS, {best[1]} px dores, x {min(xs)/s:.2f}..{max(xs)/s:.2f} CSS "
          f"(largeur {(max(xs)-min(xs)+1)/s:.2f}) couleur {im.getpixel((int(median(xs)),y))}")
    # epaisseur verticale au milieu
    xm=int(median(xs)); ys=[yy for yy in range(y0,y1) if (lambda cc:cc[0]-cc[2]>40 and cc[0]>120)(im.getpixel((xm,yy)))]
    print(f"       epaisseur verticale a x={xm/s:.1f} CSS : {(max(ys)-min(ys)+1)/s:.2f} CSS (y {min(ys)/s:.2f}..{max(ys)/s:.2f})")
    # ce qu'il y a a droite du dore
    xr=max(xs)
    print(f"       piste a droite : {im.getpixel((xr+4,y))} {im.getpixel((xr+14,y))} {im.getpixel((xr+30,y))}")
findratio(r,40,300,105,135,S_REF,'REFERENCE')
findratio(c,150,470,105,135,S_CAP,'JEU 1920')
