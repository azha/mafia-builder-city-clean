# m29 — degagement entre le bloc ARGENT (montant, dernier glyphe) et le medaillon
from lib import *
import math, json
C=json.load(open('centres.json'))
def rightmost_ink(im,x0,x1,y0,y1,s,label):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(ls); bg=srt[len(srt)//4]; pk=srt[-max(1,len(srt)//60)]
    thr=bg+0.5*(pk-bg)
    best=None
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(im.getpixel((x,y)))>=thr:
                if best is None or x>best[0]: best=(x,y)
    print(f"    {label}: encre la plus a droite x={best[0]} ({best[0]/s:.2f} CSS) a y={best[1]} ({best[1]/s:.2f} CSS) seuil {thr:.1f}")
    return best
def ring_left_at(im,cx,cy,R,y,s):
    """premier x (en venant de la gauche) ou la goldness depasse fond+50% du pic, sur la ligne y"""
    xs=list(range(int(cx-1.35*R),int(cx)))
    g=[im.getpixel((x,y))[0]-im.getpixel((x,y))[2] for x in xs]
    pk=max(g); base=median(sorted(g)[:len(g)//3]); thr=base+0.5*(pk-base)
    for i,v in enumerate(g):
        if v>=thr: return xs[i]/s, pk, thr
    return None,pk,thr
print("== m29 degagement ARGENT <-> medaillon ==")
for p,nm,key in [(CAP19,'JEU 1920','cap19'),(CAP24,'JEU 2400','dis24')]:
    im=load(p); cx,cy,R=C[key]
    b=rightmost_ink(im,380,470,60,120,S_CAP,nm+' montant')
    xl,pk,thr=ring_left_at(im,cx,cy,R,b[1],S_CAP)
    print(f"       bord GAUCHE du cerclage a cette ligne : x={xl:.2f} CSS  (pic R-B={pk:.0f}, seuil {thr:.1f})")
    print(f"       >>> DEGAGEMENT = {xl-b[0]/S_CAP:.2f} CSS")
r=load(REF); rc=C['ref']
b=rightmost_ink(r,40,260,60,110,S_REF,'REFERENCE montant')
xl,pk,thr=ring_left_at(r,rc[0],rc[1],rc[2],b[1],S_REF)
print(f"       bord GAUCHE du cerclage a cette ligne : x={xl:.2f} CSS")
print(f"       >>> DEGAGEMENT canon = {xl-b[0]/S_REF:.2f} CSS")
