# -*- coding: utf-8 -*-
"""(a) separateurs verticaux de la rangee de stats (.stats>div border-right #ffffff10)
   (b) ombre portee de la fiche (box-shadow 0 10px 26px #000c) : profil sous le bas
   Controle positif : le canon DOIT montrer les deux."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def sep(path,label,yfil,ya,yb):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    y0=yfil+int(ya*c); y1=yfil+int(yb*c)
    print(f"  {label} : rangee de stats y CSS +[{ya},{yb}] — recherche de colonnes claires")
    prof=[]
    for x in range(int(30*c),int(363*c)):
        v=sum(sum(px[x,y]) for y in range(y0,y1))/(3.0*(y1-y0))
        prof.append((x,v))
    base=sorted(v for _,v in prof)[len(prof)//2]
    hits=[(x,v) for x,v in prof if v>base+6]
    rr=runs([(x,v) for x,v in hits], lambda v:True)
    # regrouper les x contigus
    xs=[x for x,_ in hits]
    grp=[]; cur=[xs[0],xs[0]] if xs else None
    for x in xs[1:]:
        if x<=cur[1]+2: cur[1]=x
        else: grp.append(tuple(cur)); cur=[x,x]
    if cur: grp.append(tuple(cur))
    print(f"     fond median={base:.1f} ; colonnes >+6 : {[(f'{a/c:.1f}',f'{(b+1)/c:.1f}',round(max(v for x,v in hits if a<=x<=b)-base,1)) for a,b in grp if b-a>=1]}")

def ombre(path,label,ybot,xc_css):
    im=open_img(path); c=css(im); px=im.load()
    x=int(xc_css*c)
    print(f"  {label} : profil sous le bas de la fiche (y={ybot}px), x={xc_css}CSS")
    print("     ", " ".join(f"+{d}:{hexc(px[x,ybot+int(d*c)])}" for d in (2,4,7,11,16,22,30)))

print("== SEPARATEURS (bande entre valeurs et libelles : +82..+90 CSS) ==")
sep(CANON,'canon',1280,64,100)
sep(CAP16, 'cap16',1172,64,100)
print()
print("== OMBRE PORTEE ==")
# canon : bas = filet + 167 CSS ; cap16 : filet + 169.5
ombre(CANON,'canon',1280+int(167*3.0),27)
ombre(CAP16, 'cap16',1172+int(169.5*2.7551),27)
ombre(CAP24, 'cap24',1652+int(169.5*2.7551),27)
