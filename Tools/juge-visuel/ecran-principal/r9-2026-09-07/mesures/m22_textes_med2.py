# m22 — "37%"/"HEAT" du canon : bbox complete (balayage sur tout le boitier, arcs et aiguille exclus par teinte)
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m22 textes du medaillon, canon (bbox complete) ===')
def creme(c):
    r,g,b=c; return r>150 and g>145 and b>120 and abs(r-g)<25 and 0<=r-b<=70
im=ouvrir(CANON,'canon'); px=im.load(); sc=SC_CANON
mcx,mcy,mR,pvx,pvy = 587.49,116.52,93.94,587.45,130.85
lim=mR-1.5*sc/2.0
rows={}
for y in range(int(mcy-lim),int(mcy+lim)):
    xs=[x for x in range(int(mcx-lim),int(mcx+lim)) if math.hypot(x-mcx,y-mcy)<lim and creme(px[x,y])]
    if xs: rows[y]=(min(xs),max(xs),len(xs))
ys=sorted(rows); bandes=[]; cur=[ys[0]]
for y in ys[1:]:
    if y-cur[-1]<=2: cur.append(y)
    else: bandes.append(cur); cur=[y]
bandes.append(cur)
for b in bandes:
    x0=min(rows[y][0] for y in b); x1=max(rows[y][1] for y in b)
    dmax=max(math.hypot(x-mcx,y-mcy) for y in b for x in (rows[y][0],rows[y][1]))
    print('   bande y %6.2f..%6.2f CSS (haut %5.2f) x %6.2f..%6.2f (larg %5.2f) ; centre y / boitier %+.2f ; coin le plus loin %.3f R_int (degagement %.2f CSS) ; %d lignes'
          % (b[0]/sc,b[-1]/sc,(b[-1]-b[0]+1)/sc,x0/sc,x1/sc,(x1-x0+1)/sc,((b[0]+b[-1])/2-mcy)/sc,dmax/lim,(lim-dmax)/sc,len(b)))
