# m29 : le portrait — peau, silhouette sombre, col (triangle), reflet du miroir.
# Controle positif : la carte portrait a la meme largeur rail a rail des deux cotes (r15 : 421 px).
import sys; sys.path.insert(0,'.')
from lib import *
IMS={n:ouvrir(n) for n in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png')}
PX={n:IMS[n].load() for n in IMS}
R,A,B='reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png'
PEAU=(185,173,146)
def est_peau(c,t=18): return all(abs(c[i]-PEAU[i])<=t for i in range(3))

print("\n-- carte portrait : largeur rail a rail --")
for etiq,f,y in [('ref',R,1200),('2400',A,1200),('1920',B,970)]:
    px=PX[f]
    xs=[x for x in range(60,520) if est_or(px[x,y])]
    print("   %-5s x=%d..%d -> largeur %d px" % (etiq,min(xs),max(xs),max(xs)-min(xs)+1))

print("\n-- peau : bbox --")
CAS=[('ref',R,range(150,430),range(1020,1260)),('2400',A,range(120,470),range(1050,1290)),('1920',B,range(150,470),range(820,1060))]
BB={}
for etiq,f,xs,ys in CAS:
    px=PX[f]
    pts=[(x,y) for y in ys for x in xs if est_peau(px[x,y])]
    X=[p[0] for p in pts]; Y=[p[1] for p in pts]
    BB[etiq]=(min(X),max(X),min(Y),max(Y))
    print("   %-5s x=%d..%d (l=%d)  y=%d..%d (h=%d)  aire=%d px" % (etiq,min(X),max(X),max(X)-min(X)+1,min(Y),max(Y),max(Y)-min(Y)+1,len(pts)))

print("\n-- rangees ou la PEAU est aussi large ou plus large que la SILHOUETTE sombre --")
def sombre(c, fond): return lum(c)<lum(fond)+6
for etiq,f,xs,ys in CAS:
    px=PX[f]
    x0,x1,y0,y1=BB[etiq]
    n=0; details=[]
    for y in range(y0,y1+1):
        pxs=[x for x in xs if est_peau(px[x,y])]
        if not pxs: continue
        lp=max(pxs)-min(pxs)+1
        # silhouette sombre = pixels tres sombres de part et d'autre, sur la meme rangee
        gauche=[x for x in range(min(pxs)-90,min(pxs)) if lum(px[x,y])<18]
        droite=[x for x in range(max(pxs)+1,max(pxs)+91) if lum(px[x,y])<18]
        if len(gauche)<2 and len(droite)<2:
            n+=1; details.append(y)
    print("   %-5s : %d rangees (peau sans flanc sombre) %s" % (etiq,n, ("y=%d..%d"%(details[0],details[-1])) if details else ''))

print("\n-- reflet du miroir (ligne cyan horizontale) --")
CY=(127,212,217)
for etiq,f,ya,yb in [('ref',R,880,1540),('2400',A,905,1560),('1920',B,675,1325)]:
    px=PX[f]
    best=None
    for y in range(ya,yb):
        n=sum(1 for x in range(85,1035) if abs(px[x,y][1]-px[x,y][0])>18 and px[x,y][1]>40 and px[x,y][2]>=px[x,y][1]-30)
        if best is None or n>best[1]: best=(y,n)
    y=best[0]
    xs=[x for x in range(60,1060) if abs(px[x,y][1]-px[x,y][0])>18 and px[x,y][1]>40]
    print("   %-5s rangee la plus 'cyan' y=%d (n=%d) ; etendue x=%d..%d ; couleur au centre %s"
          % (etiq,y,best[1],min(xs),max(xs), mediane_fenetre(px,(min(xs)+max(xs))//2,y,0)))
    # position relative dans la carte portrait
print("\n-- col (triangle clair sous le visage) --")
CREME2=(234,224,200)
for etiq,f,xs,ys in [('ref',R,range(200,400),range(1215,1330)),('2400',A,range(180,380),range(1085,1210)),('1920',B,range(200,400),range(1050,1180))]:
    px=PX[f]
    pts=[(x,y) for y in ys for x in xs if all(abs(px[x,y][i]-CREME2[i])<=30 for i in range(3))]
    if not pts: print("   %-5s : rien" % etiq); continue
    X=[p[0] for p in pts]; Y=[p[1] for p in pts]
    w=max(X)-min(X)+1; h=max(Y)-min(Y)+1
    print("   %-5s boite %dx%d (aire %d) -> remplissage aire/boite = %.2f ; axe x=%.1f"
          % (etiq,w,h,len(pts), len(pts)/float(w*h), (min(X)+max(X))/2.0))
