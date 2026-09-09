# m33 : tuiles — detection par le FOND de la tuile (plus clair que le fond du panneau), colonne libre de texte.
import sys; sys.path.insert(0,'.')
from lib import *
IMS={n:ouvrir(n) for n in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png')}
PX={n:IMS[n].load() for n in IMS}
R,A,B='reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png'
def tuiles(px,ya,yb,xs,seuil):
    ys=[y for y in range(ya,yb) if lum(px[xs,y])>seuil]
    g=[]
    for y in ys:
        if g and y-g[-1][-1]<=2: g[-1].append(y)
        else: g.append([y])
    return [(a[0],a[-1]) for a in g if len(a)>20]
for tag,f,ya,yb,xs in (('ref',R,990,1420,970),('2400',A,985,1420,975),('1920',B,753,1190,975)):
    px=PX[f]
    print("   %-5s colonne x=%d : fond du panneau L=%.1f ; fond de tuile L=%.1f" % (tag,xs,lum(px[xs,ya+2]),lum(px[xs,(ya+yb)//2])))
    t=tuiles(px,ya,yb,xs,17)
    hs=[b-a+1 for a,b in t]; pas=[t[i+1][0]-t[i][0] for i in range(len(t)-1)]
    print("        tuiles=%s" % t)
    print("        hauteurs=%s  pas=%s" % (hs,pas))
