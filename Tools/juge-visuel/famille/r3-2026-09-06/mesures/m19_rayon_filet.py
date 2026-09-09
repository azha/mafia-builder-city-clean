# m19 — (a) RAYON des coins des rangs : pour chaque ligne du haut de la carte, x du 1er px de carte ;
#          on ajuste x0(y) = xc + R - sqrt(R^2-(R-dy)^2). Meme instrument des deux cotes : seule la
#          DIFFERENCE est opposable (biais commun de l'instrument).
#       (b) FILET de tete (.tete::after, degrade horizontal transparent->laiton->transparent) :
#          profil du canal R le long du filet, et test d'espace de melange a une variable.
# Controle positif (a) : la valeur CSS du rayon est 22,4 ; l'instrument doit rendre ~22 a la reference.
from PIL import Image
import os, math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))

def rayon(nom,px,ox,oy,f,ytop,xgauche,bb):
    # pour dy = 1..24 CSS sous le haut de la carte, trouver le 1er x (>= xgauche-4) ou B > bb+5
    pts=[]
    for dy in [i*0.5 for i in range(2,50)]:
        y=PX(ytop+dy,oy,f)
        x=PX(xgauche-6,ox,f)
        xmax=PX(xgauche+40,ox,f)
        while x<xmax and px[x,y][2]<=bb+5: x+=1
        if x<xmax: pts.append((dy,(x-ox)/f - xgauche))
    # ajustement : dx(dy) = R - sqrt(R^2-(R-dy)^2) pour dy<R
    best=None
    for R10 in range(80,400):
        R=R10/10.0
        e=0.0;n=0
        for dy,dx in pts:
            if dy>=R-0.5: continue
            pred=R-math.sqrt(max(0.0,R*R-(R-dy)**2))
            e+=(pred-dx)**2; n+=1
        if n<8: continue
        e/=n
        if best is None or e<best[1]: best=(R,e)
    print("  %-22s R ajuste = %.1f CSS (erreur quadratique %.3f, %d points)"%(nom,best[0],best[1],len(pts)))
    return best[0]

print("\n=== (a) RAYON des coins (haut-gauche) ===")
rr1=rayon("ref rang1",r,0,0,FR,252.8,48.5,27)
rr2=rayon("ref rang2",r,0,0,FR,454.3,48.5,27)
rr3=rayon("ref rang3",r,0,0,FR,629.3,48.5,27)
rc1=rayon("cap rang1",c,CX0,CY0,FC,249.7,48.4,28)
rc2=rayon("cap rang2",c,CX0,CY0,FC,451.3,48.4,28)
rc3=rayon("cap rang3",c,CX0,CY0,FC,652.8,48.4,28)
print("  moyennes : reference %.1f   jeu %.1f   delta %.1f  (valeur CSS 22,4)"%((rr1+rr2+rr3)/3,(rc1+rc2+rc3)/3,(rc1+rc2+rc3)/3-(rr1+rr2+rr3)/3))

print("\n=== (b) FILET de tete : profil horizontal du canal R ===")
def filet(nom,px,ox,oy,f,cssy):
    y=PX(cssy,oy,f)
    out=[]
    for cssx in [10,22.4,40,60,80,100,120,140,168,200,240,280,320,360,392,420,450,480,500,520,537.6,550]:
        x=PX(cssx,ox,f)
        v=[px[x,yy][0] for yy in range(y-1,y+2)]
        out.append((cssx,max(v)))
    print("  %s : %s"%(nom," ".join("%.0f:%d"%(a,b) for a,b in out)))
    return out
fr=filet("ref (y=115,2)",r,0,0,FR,115.2)
fc=filet("cap (y=114,0)",c,CX0,CY0,FC,114.0)
print("\n  fond juste au-dessus du filet :")
def fond(px,ox,oy,f,cssy):
    y=PX(cssy,oy,f); 
    return [(cssx,px[PX(cssx,ox,f),y][0]) for cssx in [10,100,280,450,550]]
print("   ref",fond(r,0,0,FR,111),"  cap",fond(c,CX0,CY0,FC,110))
