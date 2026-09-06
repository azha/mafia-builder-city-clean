# m24 — ESPACE DE MELANGE : pour 5 translucidites PLATES de la CSS, on mesure le fond reel sur CHAQUE
# image et la couleur resultante, puis on compare a la prediction sRGB et a la prediction LINEAIRE.
# Une variable a la fois (le fond est mesure, pas suppose). Controle positif : a alpha=1 les deux
# predictions coincident -> on verifie sur le rail principal en tete (laiton plein).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def lin(u):
    u/=255.0
    return u/12.92 if u<=0.04045 else ((u+0.055)/1.055)**2.4
def gam(v):
    v=max(0.0,min(1.0,v))
    return 255.0*(12.92*v if v<=0.0031308 else 1.055*v**(1/2.4)-0.055)
def pred_srgb(fg,bg,a): return tuple(round(a*fg[i]+(1-a)*bg[i]) for i in range(3))
def pred_lin(fg,bg,a):  return tuple(round(gam(a*lin(fg[i])+(1-a)*lin(bg[i]))) for i in range(3))
def med(px,ox,oy,f,x0,y0,x1,y1):
    v=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)+1):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)+1): v.append(px[x,y])
    return tuple(sorted(k[i] for k in v)[len(v)//2] for i in range(3))

CAS=[
 ("rail d'equipe #b08d3e55",(176,141,62),85/255.,
   dict(ref=((72.8,390,74.2,430),(140,390,160,430)), cap=((73.4,390,75.0,430),(140,390,160,430)))),
 ("bord de boite vide #ffffff22",(255,255,255),34/255.,
   dict(ref=((200,368.4,320,369.2),(200,373,320,377)), cap=((200,365.2,320,366.0),(200,370,320,374)))),
 ("remplissage du retour #ffffff08",(255,255,255),8/255.,
   dict(ref=((44,50,64,58),(4,50,16,58)), cap=((44,50,64,58),(4,50,16,58)))),
 ("bordure du don-rang #d9ab4e44",(217,171,78),68/255.,
   dict(ref=((536.5,175,537.0,205),(545,175,552,205)), cap=((537.1,173,537.7,203),(545,173,552,203)))),
 ("contour de pastille #7fd4d955",(127,212,217),85/255.,
   dict(ref=((153.0,315,154.0,322),(146,315,150,322)), cap=((234.6,313,235.6,320),(228,313,232,320)))),
]
for nom,fg,a,z in CAS:
    print("\n  %s   (alpha %.3f)"%(nom,a))
    for lab,(px,ox,oy,f) in {"REFERENCE":(r,0,0,FR),"JEU":(c,CX0,CY0,FC)}.items():
        (bx0,by0,bx1,by1)=z["ref" if lab=="REFERENCE" else "cap"][0]
        (fx0,fy0,fx1,fy1)=z["ref" if lab=="REFERENCE" else "cap"][1]
        obs=med(px,ox,oy,f,bx0,by0,bx1,by1)
        bg=med(px,ox,oy,f,fx0,fy0,fx1,fy1)
        ps=pred_srgb(fg,bg,a); pl=pred_lin(fg,bg,a)
        ds=sum(abs(obs[i]-ps[i]) for i in range(3)); dl=sum(abs(obs[i]-pl[i]) for i in range(3))
        print("    %-10s fond %s  observe %s  sRGB %s (ecart %d)  lineaire %s (ecart %d)  -> %s"%(
            lab,bg,obs,ps,ds,pl,dl,"sRGB" if ds<dl else "LINEAIRE"))

print("\n  controle positif (alpha=1, les deux predictions coincident) : laiton plein du rail en tete")
for lab,(px,ox,oy,f,y) in {"REFERENCE":(r,0,0,FR,250),"JEU":(c,CX0,CY0,FC,248)}.items():
    obs=med(px,ox,oy,f,31.6,y,32.6,y+6)
    print("    %-10s observe %s  (laiton plein #b08d3e = (176,141,62))"%(lab,obs))
