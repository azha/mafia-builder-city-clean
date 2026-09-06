# Grandeur : separateurs de stats (bonne bande !), centres des 3 valeurs et des 3 libelles, couleurs.
from txt import *
def seps(im,y0,y1,x0,x1,scale,label):
    px=im.load()
    base=sorted([lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)])[int(0.4*(y1-y0)*(x1-x0))]
    cands=[x for x in range(x0,x1) if sum(1 for y in range(y0,y1) if lum(px[x,y])-base>4)>0.75*(y1-y0)]
    segs=[];cur=None
    for x in cands:
        if cur is None: cur=[x,x]
        elif x-cur[1]<=2: cur[1]=x
        else: segs.append(tuple(cur)); cur=[x,x]
    if cur: segs.append(tuple(cur))
    segs=[s for s in segs if s[1]-s[0]<8]
    print(f'  {label} separateurs (fond L={base:.0f}) : ' + ', '.join(f'{(s[0]+s[1])/2/scale:.2f} CSS' for s in segs))
def cellules(im,y0,y1,x0,x1,scale,label,seuil=45):
    cols,base=colonnes(im,(x0,y0,x1,y1),seuil)
    segs=segments(cols,gap=12,minw=4)
    px=im.load()
    print(f'  {label} (fond L={base:.0f}) : {len(segs)} groupes')
    for s in segs:
        ys=[y for x,yy in cols for y in yy if s[0]<=x<=s[1]]
        pts=[(x,y) for x,yy in cols for y in yy if s[0]<=x<=s[1]]
        # couleur du pixel le + clair
        best=max(pts,key=lambda p:lum(px[p]))
        print(f'     x {s[0]/scale:7.2f}..{(s[1]+1)/scale:7.2f} CSS centre {(s[0]+s[1])/2/scale:7.2f} ; capitale {(max(ys)-min(ys)+1)/scale:5.2f} ; couleur la + claire {px[best]}')
r=op(REF)
seps(r,1480,1580,150,1120,REF_S,'REF')
cellules(r,1486,1524,150,1120,REF_S,'REF valeurs')
cellules(r,1546,1575,150,1120,REF_S,'REF libelles')
print()
c=op(C19)
seps(c,1310,1400,120,1020,CAP_S,'CAP1920')
cellules(c,1316,1360,120,1020,CAP_S,'CAP1920 valeurs')
cellules(c,1375,1402,120,1020,CAP_S,'CAP1920 libelles')
