# m14 — le secteur TEAL du cadran : son bord SUPERIEUR est-il un ARC (courbe) ou une DROITE (chevron) ?
# Grandeur : residu maximal a une droite ajustee par moindres carres sur le flanc montant.
# Controle POSITIF : sur le CANON du HUD (arc SVG, stroke circulaire), le flanc doit RESISTER a la droite
#                    (residu notable) ; et sur une DROITE synthetique le residu doit valoir ~0.
# Controle NEGATIF : si les deux rendent le meme residu, la sonde ne discrimine pas -> a jeter.
from PIL import Image
def bord_sup_teal(path,box):
    im=Image.open(path).convert('RGB'); print(f"  {path} {im.size} boite {box}")
    px=im.load(); out={}
    for x in range(box[0],box[2]):
        for y in range(box[1],box[3]):
            r,g,b=px[x,y]
            if b>g>r and (b-r)>18 and b>60:
                out[x]=y; break
    return out
def fit(pts):
    n=len(pts); sx=sum(x for x,_ in pts); sy=sum(y for _,y in pts)
    sxx=sum(x*x for x,_ in pts); sxy=sum(x*y for x,y in pts)
    a=(n*sxy-sx*sy)/(n*sxx-sx*sx); b=(sy-a*sx)/n
    res=[abs(y-(a*x+b)) for x,y in pts]
    return a,b,max(res),sum(res)/n
print("== CAPTURE : flanc GAUCHE du teal ==")
d=bord_sup_teal('capture-1080x2400.png',(470,40,620,135))
xs=sorted(d); print("   x du teal :",xs[0],"->",xs[-1])
pts=[(x,d[x]) for x in xs if 491<=x<=527]
a,b,mx,mo=fit(pts); print(f"   n={len(pts)} pente={a:.3f}  residu max={mx:.2f} px  residu moyen={mo:.2f} px")
print("   points :",pts)
print("\n== CANON HUD : flanc GAUCHE du teal (controle positif : c'est un arc SVG) ==")
d=bord_sup_teal('hud-canon-1176.png',(515,55,600,190))
xs=sorted(d); print("   x du teal :",xs[0],"->",xs[-1])
pts=[(x,d[x]) for x in xs if 518<=x<=545]
a,b,mx,mo=fit(pts); print(f"   n={len(pts)} pente={a:.3f}  residu max={mx:.2f} px  residu moyen={mo:.2f} px")
print("   points :",pts)
print("\n== CONTROLE : droite synthetique y=-x+200 sur 36 points ==")
a,b,mx,mo=fit([(x,-x+200) for x in range(491,527)]); print(f"   residu max={mx:.4f}")
print("== CONTROLE : arc de cercle synthetique R=40 sur le meme intervalle ==")
import math
pts=[(x, 100-int(round(math.sqrt(max(0,40*40-(x-527)**2))))) for x in range(491,527)]
a,b,mx,mo=fit(pts); print(f"   residu max={mx:.2f} px")
