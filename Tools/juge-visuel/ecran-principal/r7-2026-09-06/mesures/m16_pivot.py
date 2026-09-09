# -- m16 : PIVOT (disque d'axe) : position par rapport au centre du BOITIER, taille, couleur.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
C = {'ref':(195.840,38.837),'c19':(195.817,39.820),'c24':(195.819,39.817)}
RH= {'ref':31.16,'c19':32.50,'c24':32.50}

def blob(key, box, pred):
    s=sc(key); im=img(key); d=im.load()
    xs=[];ys=[];cols=[]
    for yp in range(int(box[1]*s),int(box[3]*s)):
        for xp in range(int(box[0]*s),int(box[2]*s)):
            p=d[xp,yp]
            if pred(p): xs.append(xp/s); ys.append(yp/s); cols.append(p)
    if not xs: return None
    med=tuple(sorted(c[k] for c in cols)[len(cols)//2] for k in range(3))
    return dict(n=len(xs), x0=min(xs),x1=max(xs)+1/s, y0=min(ys),y1=max(ys)+1/s,
                cx=(min(xs)+max(xs)+1/s)/2, cy=(min(ys)+max(ys)+1/s)/2,
                w=max(xs)-min(xs)+1/s, h=max(ys)-min(ys)+1/s, med=med)

# le pivot : dore sature, R>G>B nettement, luminance moyenne
piv = lambda p: p[0]>140 and p[0]-p[2]>60 and p[1]>100 and p[1]<p[0] and p[2]<120
print("=== PIVOT ===")
for key,box in [('ref',(186,36,206,50)),('c19',(186,36,206,50)),('c24',(186,36,206,50))]:
    b=blob(key,box,piv)
    if not b: print("  %s : AUCUN"%key); continue
    cx,cy=C[key]; R=RH[key]
    print("  %-4s n=%4d  boite %.2f x %.2f CSS  centre (%.2f , %.2f)  couleur mediane %s"%(key,b['n'],b['w'],b['h'],b['cx'],b['cy'],str(b['med'])))
    print("        ⇒ ECART AU CENTRE DU BOITIER : dx=%+.2f  dy=%+.2f CSS   (dy/R = %+.4f)  [dy>0 = SOUS le centre]"
          %(b['cx']-cx, b['cy']-cy, (b['cy']-cy)/R))
