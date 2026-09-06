# m44 — coherence entre resolutions + fiche a 1080x2400
from lib import *
c19=load(CAP19); c24=load(CAP24); d24=load(DIS24)
print("== m44a difference pixel entre les deux planches 2400 (fiche vs district) ==")
diff=0; rows={}
for y in range(0,2400,2):
    n=0
    for x in range(0,1080,2):
        if c24.getpixel((x,y))!=d24.getpixel((x,y)): n+=1
    if n: rows[y]=n; diff+=n
ys=sorted(rows)
print(f"    px differents (echantillon 1/4) = {diff} ; bande y {min(ys)/S_CAP:.1f}..{max(ys)/S_CAP:.1f} CSS")
print(f"    -> le chrome (y<{min(ys)/S_CAP:.1f} CSS) est IDENTIQUE bit pour bit entre les deux planches 2400")

print("\n== m44b fiche a 1080x2400 : geometrie ==")
def sides(im,y,x0,x1,s,label):
    vals=[lum(im.getpixel((x,y))) for x in range(x0,x1)]
    inside=median(vals[len(vals)//2-40:len(vals)//2+40]); outside=median(vals[:15]+vals[-15:])
    thr=(inside+outside)/2; li=ri=None
    for i in range(len(vals)-1):
        if vals[i]>thr>=vals[i+1] and li is None: li=x0+i+(vals[i]-thr)/(vals[i]-vals[i+1])
    for i in range(len(vals)-1,0,-1):
        if vals[i]>thr>=vals[i-1] and ri is None: ri=x0+i-1+(thr-vals[i-1])/(vals[i]-vals[i-1])
    print(f"    {label}: bord G {li/s:.2f}  bord D {ri/s:.2f}  largeur {(ri-li)/s:.2f} CSS")
sides(c24,1800,10,1070,S_CAP,'2400 fiche (y=653 CSS)')
sides(c19,1300,10,1070,S_CAP,'1920 fiche (y=472 CSS)')
def ink(im,x0,y0,x1,y1,s,label):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(ls); bg=srt[len(srt)//6]; pk=srt[-max(1,len(srt)//200)]; thr=bg+0.5*(pk-bg)
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(im.getpixel((x,y)))>=thr]
    X0,X1,Y0,Y1=min(p[0] for p in pts),max(p[0] for p in pts),min(p[1] for p in pts),max(p[1] for p in pts)
    print(f"    {label}: x {X0/s:.2f}..{X1/s:.2f} y {Y0/s:.2f}..{Y1/s:.2f} h={(Y1-Y0+1)/s:.2f}")
ink(c24,86,1660,994,1700,S_CAP,'2400 titre de fiche')
ink(c19,86,1224,994,1264,S_CAP,'1920 titre de fiche')
print("\n== m44c bandeau : 1920 vs 2400, meme chrome ? (encre d'ARGENT) ==")
for im,nm in [(c19,'1920'),(c24,'2400')]:
    ink(im,177,24,284,50,S_CAP,f'{nm} ARGENT')
