# m39 — 1080x2400 : etendue de l'art natif, bandes unies, gouttiere
from lib import *
def colprofile(im,x,y0,y1,s,label,step=1):
    prev=None; runs=[]
    for y in range(y0,y1):
        c=im.getpixel((x,y))
        key=c if prev is None else prev
        if prev is None or max(abs(c[k]-prev[k]) for k in range(3))>2:
            runs.append((y,c)); prev=c
    return runs
print("== m39 1080x2400 : bandes unies ==")
d=load(DIS24); c=load(CAP24)
for im,nm in [(d,'district 2400'),(c,'fiche 2400')]:
    print(f"  {nm} — colonne x=540 px (196 CSS) : segments de couleur CONSTANTE (>=8 px)")
    x=100   # colonne hors medaillon/fiche
    y=0; segs=[]
    while y<im.size[1]:
        c0=im.getpixel((x,y)); y2=y
        while y2+1<im.size[1] and max(abs(im.getpixel((x,y2+1))[k]-c0[k]) for k in range(3))<=1: y2+=1
        if y2-y>=8: segs.append((y,y2,c0))
        y=y2+1
    for a,b,cc in segs:
        print(f"     y {a/S_CAP:7.2f}..{b/S_CAP:7.2f} CSS ({b-a+1:4d} px) couleur {cc} L={lum(cc):.1f}")
    print()
