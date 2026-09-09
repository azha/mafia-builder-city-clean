# Grandeur : ronds du dock (diametre, centres), et hauteur du dock.
# Controle positif : sur la REFERENCE, .rond doit rendre 46,00 CSS (mesure-canon) et centres 94/162/230/298.
from common import *
def ronds(im,y,x0,x1,scale,label,dark=True):
    px=im.load()
    # un rond est plus SOMBRE que son fond (dock) dans la capture, et plus CLAIR dans le canon ? on mesure par ecart au fond median
    vals=[lum(px[x,y]) for x in range(x0,x1)]
    base=sorted(vals)[int(len(vals)*0.75)]
    segs=[]; cur=None
    for x in range(x0,x1):
        L=lum(px[x,y])
        hit = (base-L)>6 if dark else (L-base)>6
        if hit:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur and cur[1]-cur[0]>15: segs.append(tuple(cur))
            cur=None
    if cur and cur[1]-cur[0]>15: segs.append(tuple(cur))
    print(f'  {label} y={y} ({y/scale:.2f} CSS) fond L={base:.0f}')
    for s in segs:
        print(f'     rond x {s[0]}..{s[1]}  diam {s[1]-s[0]+1} px = {(s[1]-s[0]+1)/scale:6.2f} CSS ; centre {(s[0]+s[1])/2/scale:7.2f} CSS')
    return segs
r=op(REF)
print('REF : .rond a y 615.70..661.70 CSS -> centre 638.70 CSS -> px 1916 ; image 2091 de haut')
ronds(r,1916,150,1050,REF_S,'REF dock (rond plus clair que le fond)',dark=False)
c=op(C24)
for y in (2265,2280,2295,2310):
    ronds(c,y,100,1000,CAP_S,'CAP2400 dock',dark=True)
