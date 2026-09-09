# m37 — bas de fiche : separateurs de stats, valeurs, libelles, 3 boutons (largeur, ecart, hauteur)
from lib import *
def bands(im,x0,x1,y0,y1,s,label):
    vals=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(vals); bg=srt[len(srt)//6]; pk=srt[-max(1,len(srt)//200)]
    thr=bg+0.5*(pk-bg)
    prev=False;runs=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(im.getpixel((x,y)))>=thr)
        cur=n>=2
        if cur and not prev: st=y
        if not cur and prev: runs.append((st,y))
        prev=cur
    if prev: runs.append((st,y1))
    print(f"    {label} (seuil {thr:.1f})")
    for a,b in runs:
        xs=[x for y in range(a,b) for x in range(x0,x1) if lum(im.getpixel((x,y)))>=thr]
        print(f"       y {a/s:7.2f}..{b/s:7.2f} (h {(b-a)/s:5.2f})  x {min(xs)/s:7.2f}..{max(xs)/s:7.2f}")
def buttons(im,y,x0,x1,s,label):
    row=[lum(im.getpixel((x,y))) for x in range(x0,x1)]
    bgv=median(sorted(row)[:len(row)//3]); pk=max(row); thr=bgv+0.35*(pk-bgv)
    segs=[];cur=None
    for i,v in enumerate(row):
        if v>=thr and cur is None: cur=i
        if v<thr and cur is not None: segs.append((cur,i));cur=None
    if cur: segs.append((cur,len(row)))
    segs=[t for t in segs if t[1]-t[0]>30]
    print(f"    {label} (y={y}={y/s:.2f} CSS, seuil {thr:.1f})")
    xs=[]
    for a,b in segs:
        print(f"       bouton x {(x0+a)/s:7.2f}..{(x0+b)/s:7.2f}  largeur {(b-a)/s:6.2f} CSS")
        xs.append(((x0+a)/s,(x0+b)/s))
    for i in range(len(xs)-1):
        print(f"       ecart {i+1}-{i+2} : {xs[i+1][0]-xs[i][1]:.2f} CSS")
print("== m37 bas de fiche ==")
r=load(REF); c=load(CAP19)
print("  REFERENCE")
bands(r,95,1080,1460,1620,S_REF,'ref stats+actions')
print("  JEU 1920")
bands(c,86,994,1330,1470,S_CAP,'jeu stats+actions')
print()
print("  boutons — ligne de mi-hauteur")
buttons(r,1668,80,1100,S_REF,'REF boutons')     # actions y 538.89..578.7 CSS -> px 1617..1736 ; mi 1676
buttons(c,1462,70,1010,S_CAP,'JEU boutons')
