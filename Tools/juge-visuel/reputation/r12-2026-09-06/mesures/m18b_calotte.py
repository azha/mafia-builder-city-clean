import sys; sys.path.insert(0,'.')
from lib import *
print("=== m18b : calotte — bornes du visage VERIFIEES au profil (m18a), puis mesures ===")
def peau(c):
    r,g,b=c; return 150<r<215 and 140<g<205 and 110<b<175 and r>g>b
def proche(c, ref, tol=6): return all(abs(c[i]-ref[i])<=tol for i in range(3))
CAS=[('REF','../reference-1080x2102.png',(22,25,27),(11,16,22),1099,1232,1030),
     ('JEU','../capture-1080x2400.png',  (22,22,28),(13,14,23),1118,1257,1051)]
for nom,f,fill,outl,ytop,ybot,ctop in CAS:
    im=ouvrir(f); p=px(im)
    h=ybot-ytop+1
    def lp(y):
        xs=[x for x in range(140,420) if peau(p[x,y])]
        return (min(xs),max(xs)) if xs else None
    def lc(y):
        xs=[x for x in range(140,420) if proche(p[x,y],fill) or proche(p[x,y],outl)]
        if not xs: return None
        # garder le groupe contigu le plus large
        g=[];  
        for x in xs:
            if g and x-g[-1][-1]<=3: g[-1].append(x)
            else: g.append([x])
        g=max(g,key=len)
        return (g[0],g[-1])
    print(f"  {nom} visage y {ytop}..{ybot} (h={h}) ; sommet de la coiffe y={ctop}")
    lmax=max((lp(y)[1]-lp(y)[0]+1) for y in range(ytop,ybot+1) if lp(y))
    cmax=max((lc(y)[1]-lc(y)[0]+1) for y in range(ctop,ybot+1) if lc(y))
    print(f"     largeur max visage = {lmax} px ; largeur max coiffe = {cmax} px ; rapport = {cmax/lmax:.3f}")
    print(f"     hauteur au-dessus du visage : {ytop-ctop} px = {100*(ytop-ctop)/h:.1f} % de la hauteur du visage")
    for frac in (0.10,0.15,0.25,0.40,0.60):
        y=int(round(ytop+frac*h)); tp=lp(y); tc=lc(y)
        if tp and tc:
            print(f"     a {int(frac*100):2d} % (y={y}) : peau {tp[0]}..{tp[1]} coiffe {tc[0]}..{tc[1]} -> epaisseur laterale G={tp[0]-tc[0]} D={tc[1]-tp[1]}")
        elif tp: print(f"     a {int(frac*100):2d} % (y={y}) : peau {tp[0]}..{tp[1]} — coiffe absente")
    # pincement du sommet : largeur a n px sous le sommet, normalisee par cmax
    print("     pincement du sommet (largeur / largeur max) :")
    for d in (2,4,6,8,12,16,24,32,40):
        t=lc(ctop+d)
        if t: print(f"        {d:2d} px sous le sommet : {t[1]-t[0]+1:3d} px = {100*(t[1]-t[0]+1)/cmax:5.1f} %")
    # bord bas lateral de la coiffe : plus bas y ou la coiffe deborde de la peau de >3 px
    bas=None
    for y in range(ytop,ybot+40):
        tp,tc=lp(y),lc(y)
        if tp and tc and (tp[0]-tc[0]>3 or tc[1]-tp[1]>3): bas=y
    print(f"     coiffe deborde lateralement jusqu'a y={bas} = {100*(bas-ytop)/h:.0f} % de la hauteur du visage")
    print()
