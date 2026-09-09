# m32 : tuiles — bornes, hauteur, pas ; + palette recalculee avec un decoupage DECALE (controle du biais de seau).
import sys; sys.path.insert(0,'.')
from lib import *
IMS={n:ouvrir(n) for n in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png')}
PX={n:IMS[n].load() for n in IMS}
R,A,B='reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png'

print("\n== tuiles : frontieres horizontales dans la colonne des tuiles ==")
def front(px,ya,yb,xa,xb,seuil=0.8):
    out=[]
    for y in range(ya+1,yb):
        s=sum(abs(lum(px[x,y])-lum(px[x,y-1])) for x in range(xa,xb))/(xb-xa)
        if s>seuil: out.append((y,s))
    g=[]
    for y,s in out:
        if g and y-g[-1][-1][0]<=2: g[-1].append((y,s))
        else: g.append([(y,s)])
    return [(a[0][0],a[-1][0]) for a in g]
print("   ref  :", front(PX[R],1000,1420,560,980))
print("   2400 :", front(PX[A],990,1420,560,980))
print("   1920 :", front(PX[B],758,1190,560,980))

print("\n== palette : decoupage a 24 puis DECALE de 12 (controle du biais de seau) ==")
from collections import Counter
for tag,f,box in (('ref',R,(24,455,1056,2075)),('2400',A,(21,486,1058,2105))):
    px=PX[f]; x0,y0,x1,y1=box
    for dec in (0,12):
        cnt=Counter(); n=0
        for y in range(y0,y1,3):
            for x in range(x0,x1,3):
                c=px[x,y]; cnt[((c[0]+dec)//24,(c[1]+dec)//24,(c[2]+dec)//24)]+=1; n+=1
        top=cnt.most_common(4)
        print("   %-5s decalage=%2d : %s" % (tag,dec, [("%.1f%%"%(100.0*v/n)) for k,v in top]))
    # distance de couleur moyenne entre les deux images sur les aplats de fond
print("\n== fonds de panneau : comparaison directe (mediane 9x9) ==")
for lab,pr,pa in [("panneau de titre",(120,495),(120,525)),("tuile 1",(950,1035),(950,1030)),("carte portrait",(140,930),(140,950)),("panneau bas",(900,1680),(900,1615))]:
    a=mediane_fenetre(PX[R],pr[0],pr[1],4); b=mediane_fenetre(PX[A],pa[0],pa[1],4)
    print("   %-18s ref=%-15s 2400=%-15s  D=%s" % (lab,a,b,tuple(b[i]-a[i] for i in range(3))))
