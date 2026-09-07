# m34 : reflet du miroir (epaisseur, pic, etendue) + col/cou du portrait.
import sys; sys.path.insert(0,'.')
from lib import *
IMS={n:ouvrir(n) for n in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png')}
PX={n:IMS[n].load() for n in IMS}
R,A,B='reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png'

print("\n== reflet du miroir : profil vertical a x=700 (hors tuile ? on prend la mediane de ligne) ==")
for tag,f,ya,yb,pan in (('ref',R,1060,1110,(848,1614)),('2400',A,1080,1130,(874,1551)),('1920',B,845,895,(642,1319))):
    px=PX[f]
    # excès de la moyenne de rangee par rapport a la mediane locale (bande hors du reflet)
    base=mediane([sum(lum(px[x,y]) for x in range(90,1030))/940.0 for y in list(range(ya,ya+12))+list(range(yb-12,yb))])
    prof=[(y, sum(lum(px[x,y]) for x in range(90,1030))/940.0 - base) for y in range(ya,yb)]
    pic=max(prof,key=lambda t:t[1])
    demi=[y for y,v in prof if v>=0.5*pic[1]]
    dixieme=[y for y,v in prof if v>=0.10*pic[1]]
    y=pic[0]
    xs=[x for x in range(60,1070) if lum(px[x,y])-lum(px[x,ya+2])>3]
    print("   %-5s pic=%.1f pts a y=%d | epaisseur a mi-hauteur=%d px | a 1/10=%d px | etendue x=%d..%d (%d px)"
          % (tag,pic[1],pic[0], len(demi), len(dixieme), min(xs),max(xs), max(xs)-min(xs)+1))
    print("        position dans le panneau elastique : %.1f %% de sa hauteur ; couleur au coeur %s"
          % (100.0*(pic[0]-pan[0])/(pan[1]-pan[0]), mediane_fenetre(px,700,pic[0],0)))

print("\n== cou (rectangle) et col (triangle) — segmentation par la couleur claire, sous le visage ==")
CLAIR=(234,224,200); PEAU=(185,173,146)
def bloc(px,xs,ys,ref,t):
    pts=[(x,y) for y in ys for x in xs if all(abs(px[x,y][i]-ref[i])<=t for i in range(3))]
    if not pts: return None
    X=[p[0] for p in pts]; Y=[p[1] for p in pts]
    return (min(X),max(X),min(Y),max(Y),len(pts))
for tag,f,ys_cou,ys_col in (('ref',R,range(1180,1250),range(1230,1330)),
                            ('2400',A,range(1180,1260),range(1245,1345)),
                            ('1920',B,range(950,1030),range(1015,1115))):
    px=PX[f]
    c=bloc(px,range(200,400),ys_cou,PEAU,18)
    t=bloc(px,range(180,420),ys_col,CLAIR,26)
    if c: print("   %-5s COU  x=%d..%d (l=%d) y=%d..%d (h=%d)" % (tag,c[0],c[1],c[1]-c[0]+1,c[2],c[3],c[3]-c[2]+1))
    if t:
        w=t[1]-t[0]+1; h=t[3]-t[2]+1
        # largeur par rangee -> teste la forme triangulaire
        larg=[]
        for y in range(t[2],t[3]+1):
            xs2=[x for x in range(180,420) if all(abs(px[x,y][i]-CLAIR[i])<=26 for i in range(3))]
            if xs2: larg.append((y,max(xs2)-min(xs2)+1))
        print("   %-5s COL  boite %dx%d aire=%d remplissage=%.2f axe x=%.1f ; largeur haut=%s bas=%s"
              % (tag,w,h,t[4],t[4]/float(w*h),(t[0]+t[1])/2.0, larg[0][1] if larg else '?', larg[-1][1] if larg else '?'))
