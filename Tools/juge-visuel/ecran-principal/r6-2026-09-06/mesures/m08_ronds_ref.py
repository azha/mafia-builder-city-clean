# m08 — cerclage des ronds : mesure PROPRE (fenetre par rond, seuil sur le remplissage local)
from lib import *
r=load(REF); c24=load(CAP24); c19=load(CAP19)

def ring(im,y,xa,xb,s,label):
    prof=[(x,lum(im.getpixel((x,y)))) for x in range(xa,xb)]
    vals=[v for _,v in prof]
    bg=median(vals[:8]); fill=median(vals[len(vals)//2-6:len(vals)//2+6])
    pk=max(vals[:len(vals)//3])
    thr=max(bg,fill)+0.4*(pk-max(bg,fill))
    segs=[];cur=None
    for i,(x,v) in enumerate(prof):
        if v>=thr and cur is None: cur=i
        if v<thr and cur is not None: segs.append((cur,i));cur=None
    if cur is not None: segs.append((cur,len(prof)))
    e=[]
    for a,b in segs:
        e.append((prof[a][0]/s,(prof[b-1][0]+1)/s,max(v for _,v in prof[a:b])))
    if len(e)>=2:
        d=e[-1][1]-e[0][0]
        print(f"    {label}: fond L={bg:.1f} remplissage L={fill:.1f} pic L={pk:.1f}")
        print(f"       bord G {e[0][0]:7.2f}..{e[0][1]:7.2f} (larg {e[0][1]-e[0][0]:.2f}, pic {e[0][2]:.1f}) | "
              f"bord D {e[-1][0]:7.2f}..{e[-1][1]:7.2f} (larg {e[-1][1]-e[-1][0]:.2f}, pic {e[-1][2]:.1f})")
        print(f"       DIAMETRE (nominal, bord exterieur a bord exterieur) = {d:.2f} CSS  centre = {(e[0][0]+e[-1][1])/2:.2f}")
        return d,(e[0][0]+e[-1][1])/2
    print(f"    {label}: pas 2 bords ({len(e)})"); return None,None

print("== m08 ronds : REFERENCE (y=1920) ==")
R=[]
for i,(xa,xb) in enumerate([(200,360),(404,564),(608,768),(812,972)]):
    R.append(ring(r,1920,xa,xb,S_REF,f'ref rond {i+1}'))
print("== m08 ronds : JEU 1080x2400 (y=2240, fond plat) ==")
C=[]
for i,(xa,xb) in enumerate([(185,330),(372,517),(560,705),(747,892)]):
    C.append(ring(c24,2240,xa,xb,S_CAP,f'jeu24 rond {i+1}'))
print("== m08 ronds : JEU 1080x1920 (y=1760, fond CLAIR = eau) ==")
for i,(xa,xb) in enumerate([(185,330),(372,517),(560,705),(747,892)]):
    ring(c19,1760,xa,xb,S_CAP,f'jeu19 rond {i+1}')

print("\n== couleur du cerclage lue au SOMMET du rond (trait horizontal, peu d'AA) ==")
def top_ring(im,xc,y0,y1,s,label):
    prof=[(y,im.getpixel((xc,y))) for y in range(y0,y1)]
    best=max(prof,key=lambda t:lum(t[1]))
    print(f"    {label}: y={best[0]} ({best[0]/s:.2f} CSS) couleur {best[1]} L={lum(best[1]):.1f}")
    return best
top_ring(r,282,1870,1900,S_REF,'ref rond1 sommet')
top_ring(c24,259,2180,2215,S_CAP,'jeu24 rond1 sommet')
