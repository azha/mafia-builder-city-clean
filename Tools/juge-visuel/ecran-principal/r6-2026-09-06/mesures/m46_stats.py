# m46 — separateurs verticaux des stats + centres des 3 cellules
from lib import *
def seps(im,y,x0,x1,s,label):
    row=[(x,lum(im.getpixel((x,y)))) for x in range(x0,x1)]
    base=median([v for _,v in row]); pk=max(v for _,v in row); thr=base+0.35*(pk-base)
    segs=[];cur=None
    for i,(x,v) in enumerate(row):
        if v>=thr and cur is None: cur=i
        if v<thr and cur is not None: segs.append((cur,i));cur=None
    if cur: segs.append((cur,len(row)))
    print(f"    {label} (y={y/s:.2f} CSS, base L={base:.1f} pic {pk:.1f} seuil {thr:.1f}) : "
          + ' | '.join(f"{(row[a][0]+row[b-1][0])/2/s:.2f}" for a,b in segs))
print("== m46 separateurs de stats ==")
r=load(REF); c=load(CAP19)
seps(r,1540,60,1120,S_REF,'REF (y 513 CSS, entre valeurs et libelles)')
seps(c,1420,50,1030,S_CAP,'JEU (y 515 CSS)')
print()
def centres(im,x0,x1,y0,y1,s,label,ncell=3):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(ls); bg=srt[len(srt)//6]; pk=srt[-max(1,len(srt)//150)]; thr=bg+0.5*(pk-bg)
    cols=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1) if lum(im.getpixel((x,y)))>=thr)
        cols.append((x,n))
    runs=[];cur=None
    for x,n in cols:
        if n>0 and cur is None: cur=x
        if n==0 and cur is not None:
            if x-cur>2: runs.append((cur,x))
            cur=None
    if cur: runs.append((cur,x1))
    # regrouper en 3 cellules par les grands trous
    groups=[];g=[runs[0]]
    for rr in runs[1:]:
        if rr[0]-g[-1][1] > 15*s/3: groups.append(g); g=[rr]
        else: g.append(rr)
    groups.append(g)
    print(f"    {label}: {len(groups)} cellules")
    for gg in groups:
        a=gg[0][0]; b=gg[-1][1]
        print(f"       x {a/s:7.2f}..{b/s:7.2f}  centre {(a+b)/2/s:7.2f}")
centres(r,95,1080,1550,1580,S_REF,'REF libelles de stats')
centres(c,86,994,1428,1450,S_CAP,'JEU libelles de stats')
