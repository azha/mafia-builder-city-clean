# m30 — degagement ARGENT <-> medaillon, avec EXCLUSION du disque du medaillon
# Controle NEGATIF : sans l'exclusion, la sonde attrape le cerclage (elle l'a fait : -1.09 CSS faux).
from lib import *
import math, json
C=json.load(open('centres.json'))
def euro(im,cx,cy,R,s,label,x0,x1,y0,y1):
    ls=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if math.hypot(x-cx,y-cy)<=1.12*R: continue
            ls.append(lum(im.getpixel((x,y))))
    srt=sorted(ls); bg=srt[len(srt)//4]; pk=srt[-max(1,len(srt)//50)]
    thr=bg+0.5*(pk-bg)
    best=None; n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if math.hypot(x-cx,y-cy)<=1.12*R: continue
            if lum(im.getpixel((x,y)))>=thr:
                n+=1
                if best is None or x>best[0]: best=(x,y)
    print(f"    {label}: n={n} px d'encre hors medaillon ; le plus a droite x={best[0]} ({best[0]/s:.2f} CSS) y={best[1]} ({best[1]/s:.2f} CSS)")
    return best
def ring_left_at(im,cx,cy,R,y,s):
    xs=list(range(int(cx-1.35*R),int(cx)))
    g=[im.getpixel((x,y))[0]-im.getpixel((x,y))[2] for x in xs]
    pk=max(g); base=median(sorted(g)[:len(g)//3]); thr=base+0.5*(pk-base)
    for i,v in enumerate(g):
        if v>=thr: return xs[i]/s
    return None
print("== m30 degagement ARGENT <-> medaillon (medaillon exclu de la sonde) ==")
for p,nm,key in [(CAP19,'JEU 1920','cap19'),(CAP24,'JEU 2400','dis24')]:
    im=load(p); cx,cy,R=C[key]
    b=euro(im,cx,cy,R,S_CAP,nm,380,480,55,125)
    xl=ring_left_at(im,cx,cy,R,b[1],S_CAP)
    print(f"       bord gauche du cerclage a y={b[1]/S_CAP:.2f} CSS : x={xl:.2f} CSS")
    print(f"       >>> DEGAGEMENT = {xl-b[0]/S_CAP:+.2f} CSS")
