# m38 — boutons : bouton OR (rempli) mesure par sa goldness ; boutons LIGNE par leur bord clair
from lib import *
def goldrect(im,x0,y0,x1,y1,s,label):
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1)
         if (lambda c:c[0]-c[2]>60 and c[0]>140)(im.getpixel((x,y)))]
    if not pts: print(f"    {label}: 0 px"); return
    X0,X1,Y0,Y1=min(p[0] for p in pts),max(p[0] for p in pts),min(p[1] for p in pts),max(p[1] for p in pts)
    print(f"    {label}: x {X0/s:7.2f}..{X1/s:7.2f} (l={(X1-X0+1)/s:6.2f}) y {Y0/s:7.2f}..{Y1/s:7.2f} (h={(Y1-Y0+1)/s:5.2f}) n={len(pts)}")
    print(f"       couleur haut {im.getpixel(((X0+X1)//2,Y0+3))}  bas {im.getpixel(((X0+X1)//2,Y1-3))}")
    return X0/s,X1/s,Y0/s,Y1/s
def outline(im,y,x0,x1,s,label):
    row=[(x,lum(im.getpixel((x,y)))) for x in range(x0,x1)]
    base=median([v for _,v in row]); pk=max(v for _,v in row); thr=base+0.45*(pk-base)
    segs=[];cur=None
    for i,(x,v) in enumerate(row):
        if v>=thr and cur is None: cur=i
        if v<thr and cur is not None: segs.append((cur,i));cur=None
    if cur: segs.append((cur,len(row)))
    print(f"    {label} (y={y/s:.2f} CSS, base L={base:.1f} pic {pk:.1f} seuil {thr:.1f}) : "
          + ' | '.join(f"{row[a][0]/s:.2f}..{row[b-1][0]/s:.2f}" for a,b in segs if b-a>=1))
print("== m38 boutons ==")
r=load(REF); c=load(CAP19)
goldrect(r,60,1600,400,1750,S_REF,'REF bouton OR (COLLECTER)')
goldrect(c,40,1440,360,1620,S_CAP,'JEU bouton OR (COLLECTER)')
print("  bords des boutons LIGNE (scan a mi-hauteur du bloc actions)")
outline(r,1676,380,1120,S_REF,'REF')
outline(c,1520,340,1030,S_CAP,'JEU')
