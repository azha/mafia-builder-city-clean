import sys; sys.path.insert(0,'.')
from lib import *
print("=== m14b : balayage teal — exces de teal par rapport au fond LOCAL (y-25 / y+25) ===")
def sc(c):
    r,g,b=c; return (g+b)/2 - r
CAS=[('REF','../reference-1080x2102.png',452,1626, 850,1611, 1070,1100),
     ('JEU','../capture-1080x2400.png',  482,1627, 876,1655, 1085,1115)]
for nom,f,ct,h,ey0,ey1,y0,y1 in CAS:
    im=ouvrir(f); p=px(im)
    def exces(x,y): return sc(p[x,y]) - (sc(p[x,y-25])+sc(p[x,y+25]))/2
    best=max(((y, sum(exces(x,y) for x in range(120,960))/840) for y in range(y0,y1)), key=lambda t:t[1])
    yb=best[0]
    print(f"  {nom} pic y={yb} (exces moyen {best[1]:.1f}) — rel {yb-ct} ; {100*(yb-ey0)/(ey1-ey0+1):.1f} % du panneau elast")
    xs=[x for x in range(0,1080) if exces(x,yb)>4]
    print(f"     etendue x {min(xs)}..{max(xs)} = {max(xs)-min(xs)+1} px  ({len(xs)} colonnes au-dessus du seuil)")
    xm=(min(xs)+max(xs))//2
    ep=[y for y in range(yb-12,yb+12) if exces(xm,y)>4]
    print(f"     epaisseur au centre x={xm} : {len(ep)} px (y {min(ep)}..{max(ep)})")
    pts=[(x, round(exces(x,yb),1)) for x in [min(xs), min(xs)+40, 300, 450, 540, 630, 780, max(xs)-40, max(xs)]]
    print(f"     exces le long de la ligne : {pts}")
    # bornes du panneau elast en x
    print(f"     (le panneau elast va de x=50 a 1027 en REF, 46 a 1031 en JEU ; la carte finit a x=505/501)")
