# Meme grandeur, bande restreinte a la HAUTEUR des ronds (au-dessus des libelles), seuil plus strict.
from common import *
def ronds(im,y,x0,x1,scale,label):
    px=im.load()
    vals=[lum(px[x,y]) for x in range(x0,x1)]
    base=sorted(vals)[len(vals)//2]
    hits=[x for x in range(x0,x1) if lum(px[x,y])-base>5]
    segs=[];cur=None
    for x in hits:
        if cur is None: cur=[x,x]
        elif x-cur[1]<=4: cur[1]=x
        else: segs.append(tuple(cur)); cur=[x,x]
    if cur: segs.append(tuple(cur))
    segs=[s for s in segs if s[1]-s[0]>=1]
    print(f'  {label} y={y} ({y/scale:.2f} CSS) fond L={base:.0f} : {len(segs)} bords')
    if len(segs)>=8:
        # paires = un rond
        for i in range(0,len(segs)-1,2):
            a,b=segs[i],segs[i+1]
            d=b[1]-a[0]+1
            print(f'     rond : bords x {a} et {b} ; diam {d} px = {d/scale:6.2f} CSS ; centre {(a[0]+b[1])/2/scale:7.2f} CSS')
    else:
        print(f'     {segs}')
c=op(C24)
for y in (2200,2210,2220):
    ronds(c,y,100,1000,CAP_S,'CAP2400 district')
c19=op(C19)
for y in (1725,1735):
    ronds(c19,y,100,1000,CAP_S,'CAP1920 fiche')
t=op(T24)
ronds(t,2225,100,1000,CAP_S,'TEMOIN famille')
