# m25 — filet du bandeau + barre de ratio + aile droite (debordement) + volutes
from lib import *
print("== m25a filet bas du bandeau (scan vertical a x=100 CSS, hors medaillon) ==")
def filet(im,xc,y0,y1,s,label):
    vals=[(y,im.getpixel((xc,y))) for y in range(y0,y1)]
    g=[(y,c[0]-c[2]) for y,c in vals]
    pk=max(g,key=lambda t:t[1])
    base=median(sorted([v for _,v in g])[:len(g)//2])
    thr=base+0.5*(pk[1]-base)
    i=[y for y,_ in g].index(pk[0]); a=i
    while a>0 and g[a][1]>=thr: a-=1
    b=i
    while b<len(g)-1 and g[b][1]>=thr: b+=1
    print(f"    {label}: pic R-B={pk[1]} a y={pk[0]} = {pk[0]/s:.2f} CSS ; couleur {im.getpixel((xc,pk[0]))}")
    print(f"       filet y {(g[a][0]+1)/s:.2f}..{g[b][0]/s:.2f} CSS  epaisseur {(g[b][0]-g[a][0]-1)/s:.2f} CSS")
r=load(REF); c=load(CAP19); d=load(DIS24)
filet(r,300,130,180,S_REF,'REFERENCE x=100 CSS')
filet(c,276,120,180,S_CAP,'JEU 1920 x=100 CSS')
filet(d,276,120,180,S_CAP,'JEU district 2400 x=100 CSS')

print("\n== m25b barre de ratio sous le montant ==")
def ratio(im,y,x0,x1,s,label):
    row=[(x,im.getpixel((x,y))) for x in range(x0,x1)]
    print(f"    {label} (y={y} = {y/s:.2f} CSS)")
    segs=[];cur=None
    for x,cc in row:
        gold = cc[0]-cc[2]>40 and cc[0]>120
        if gold and cur is None: cur=x
        if not gold and cur is not None: segs.append((cur,x)); cur=None
    if cur: segs.append((cur,x1))
    for a,b in segs:
        if b-a>4: print(f"       segment DORE x {a/s:7.2f}..{b/s:7.2f} CSS (largeur {(b-a)/s:6.2f})  couleur {im.getpixel(((a+b)//2,y))}")
    # piste grise a droite du dore
    if segs:
        b=segs[-1][1]
        print(f"       apres le dore : x {b/s:7.2f} -> {im.getpixel((b+3,y))}, {im.getpixel((b+12,y))}, {im.getpixel((b+30,y))}")
# canon : ratio a y = 21+13.67+3 ~ 38 CSS -> px 114 ; on balaie
for yy in range(108,128,2): 
    pass
ratio(r,120,40,300,S_REF,'REFERENCE')
ratio(c,133,170,470,S_CAP,'JEU 1920')
