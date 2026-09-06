# m28 — interieur des medaillons : degrade radial (#243048 -> #0f1622 a 66%) + rayons coniques
# (rgba(255,255,255,.05) 4deg/9deg) + couleur du buste (#cfc4a6). Points echantillonnes en % du
# rayon depuis le centre. Controle positif : la couleur du buste doit etre la meme des deux cotes.
from PIL import Image
import os, math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def med(px,ox,oy,f,cx,cy,dx,dy,w=3):
    X=PX(cx+dx,ox,f); Y=PX(cy+dy,oy,f); v=[]
    for y in range(Y-w,Y+w+1):
        for x in range(X-w,X+w+1): v.append(px[x,y])
    return tuple(sorted(k[i] for k in v)[len(v)//2] for i in range(3))
REF=(100.75,302.75); CAP=(100.51,299.68)   # medaillon lieutenant 1
print("\n== interieur du medaillon (lieutenant 1) : mediane 7x7 CSS ==")
for lab,dx,dy in [("haut-gauche (38%,30%)",-11,-14),("centre",0,-8),("haut-droit",12,-14),
                  ("gauche",-22,0),("droit",22,0),("bas (sous le buste)",0,26)]:
    print("  %-24s ref %s   cap %s"%(lab,med(r,0,0,FR,REF[0],REF[1],dx,dy),med(c,CX0,CY0,FC,CAP[0],CAP[1],dx,dy)))
print("\n== couche du BUSTE (controle positif : #cfc4a6=(207,196,166)) ==")
for lab,dx,dy in [("epaule gauche",-11,24),("epaule droite",11,24),("capuche",0,-2)]:
    print("  %-24s ref %s   cap %s"%(lab,med(r,0,0,FR,REF[0],REF[1],dx,dy),med(c,CX0,CY0,FC,CAP[0],CAP[1],dx,dy)))
print("\n== amplitude des RAYONS coniques : ecart type du canal B sur un cercle a 60%% du rayon ==")
def rayons(px,ox,oy,f,cx,cy,R):
    X=PX(cx,ox,f);Y=PX(cy,oy,f);rr=R*f;v=[]
    for k in range(720):
        a=k*math.pi/360.
        x=int(round(X+rr*math.cos(a)));y=int(round(Y+rr*math.sin(a)))
        v.append(px[x,y][2])
    m=sum(v)/len(v); sd=(sum((k-m)**2 for k in v)/len(v))**.5
    return m,sd,min(v),max(v)
print("  ref", ["%.1f"%k for k in rayons(r,0,0,FR,REF[0],REF[1],21)])
print("  cap", ["%.1f"%k for k in rayons(c,CX0,CY0,FC,CAP[0],CAP[1],21)])
