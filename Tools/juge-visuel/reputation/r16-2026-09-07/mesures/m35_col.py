# m35 : le col (triangle creme) — fenetre large, bornes imprimees, largeur par rangee.
import sys; sys.path.insert(0,'.')
from lib import *
IMS={n:ouvrir(n) for n in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png')}
PX={n:IMS[n].load() for n in IMS}
CLAIR=(234,224,200)
def est(c,t=26): return all(abs(c[i]-CLAIR[i])<=t for i in range(3))
for tag,f,ya,yb in (('ref','reference-1080x2102.png',1230,1420),('2400','capture-1080x2400.png',1180,1400),('1920','capture-1080x1920.png',950,1170)):
    px=PX[f]
    rows=[]
    for y in range(ya,yb):
        xs=[x for x in range(150,450) if est(px[x,y])]
        if xs: rows.append((y,min(xs),max(xs),max(xs)-min(xs)+1,len(xs)))
    if not rows: print("   %-5s rien" % tag); continue
    y0=rows[0][0]; y1=rows[-1][0]
    w=max(r[3] for r in rows); aire=sum(r[4] for r in rows)
    print("   %-5s creme : y=%d..%d (h=%d) ; largeur max=%d ; aire=%d ; remplissage aire/(w*h)=%.2f ; axe x=%.1f"
          % (tag,y0,y1,y1-y0+1,w,aire, aire/float(w*(y1-y0+1)), (rows[0][1]+rows[0][2])/2.0))
    ech=rows[::max(1,len(rows)//10)]
    print("        largeur par rangee :", " ".join("y%d:%d"%(r[0],r[3]) for r in ech))
