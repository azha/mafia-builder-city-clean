import sys; sys.path.insert(0,'.')
from lib import *
print("=== m18c : epaisseur LATERALE de la coiffe, cote gauche et cote droit separement ===")
def peau(c):
    r,g,b=c; return 150<r<215 and 140<g<205 and 110<b<175 and r>g>b
def proche(c, ref, tol=6): return all(abs(c[i]-ref[i])<=tol for i in range(3))
CAS=[('REF','../reference-1080x2102.png',(22,25,27),(11,16,22),1099,1232),
     ('JEU','../capture-1080x2400.png',  (22,22,28),(13,14,23),1118,1257)]
for nom,f,fill,outl,ytop,ybot in CAS:
    im=ouvrir(f); p=px(im); h=ybot-ytop+1
    print(f"  {nom} (visage {ytop}..{ybot}, h={h})")
    for frac in (0.05,0.10,0.15,0.20,0.30,0.50,0.70):
        y=int(round(ytop+frac*h))
        xs=[x for x in range(140,420) if peau(p[x,y])]
        if not xs: print(f"     {int(frac*100):2d} % (y={y}) : pas de peau"); continue
        pl,pr=min(xs),max(xs)
        g=[x for x in range(140,pl) if proche(p[x,y],fill) or proche(p[x,y],outl)]
        d=[x for x in range(pr+1,420) if proche(p[x,y],fill) or proche(p[x,y],outl)]
        # ne garder que le groupe CONTIGU accole au visage
        def accole(lst, bord, sens):
            if not lst: return 0
            lst=sorted(lst, reverse=(sens<0))
            n=0; prev=bord
            for x in lst:
                if abs(x-prev)<=3: n+=1; prev=x
                else: break
            return n
        eg=accole(g, pl, -1); ed=accole(d, pr, +1)
        print(f"     {int(frac*100):2d} % (y={y}) : peau {pl}..{pr} | coiffe accolee  G={eg} px  D={ed} px")
