# -- m57 : le canon declare `.fiche{background:linear-gradient(180deg,#0c1320ef,#080d17f6);backdrop-filter:blur(5px)}`
#    ⇒ plaque a ~93-96 % d'opacite ET flou de 5 px sur ce qui transparait.
#    Test : le fond de la plaque du JEU correle-t-il mieux avec l'art BRUT (d24) ou avec l'art FLOUTE a 5 CSS ?
#    Controle : si le jeu floutait, la correlation avec le brut serait la plus faible des deux.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
from PIL import Image, ImageFilter
s=sc('c24')
A=img('d24'); B=img('c24')
box=(int(17*s),int(604*s),int(376*s),int(762*s))
art=A.crop(box).convert('RGB')
res=B.crop(box).convert('RGB')
r5=5.0*s/2.0   # rayon gaussien ~ 5 CSS
flou=art.filter(ImageFilter.GaussianBlur(radius=r5))
print("  fenetre :",art.size," rayon de flou : %.2f px (= 5,0 CSS)"%r5)
da=art.load(); df=flou.load(); dr=res.load()
def reg(getx):
    xs=[];ys=[]
    for y in range(art.height):
        for x in range(art.width):
            p=dr[x,y]
            if lum(p)<48 and max(p)<70:
                xs.append(getx(x,y)); ys.append(p[0])
    n=len(xs); mx=sum(xs)/n; my=sum(ys)/n
    sxx=sum((v-mx)**2 for v in xs); syy=sum((v-my)**2 for v in ys)
    sxy=sum((a-mx)*(b-my) for a,b in zip(xs,ys))
    return n, sxy/sxx, sxy/math.sqrt(sxx*syy)
n,a1,r1=reg(lambda x,y: da[x,y][0])
n,a2,r2=reg(lambda x,y: df[x,y][0])
print("  canal R, n=%d"%n)
print("   contre l'art BRUT    : pente %.4f  correlation r = %.3f"%(a1,r1))
print("   contre l'art FLOUTE  : pente %.4f  correlation r = %.3f"%(a2,r2))
print("   ⇒ %s"%("le jeu suit l'art BRUT (pas de flou)" if r1>r2 else "le jeu suit l'art FLOUTE"))
