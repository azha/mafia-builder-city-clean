# m29 — profil RADIAL de l'interieur du medaillon (mediane sur un cercle complet, ce qui moyenne les
# rayons coniques). Angles du buste exclus par la mediane. Controle positif : a r=0 les deux images
# doivent rendre le buste (couleur creme) ; controle negatif : au-dela de l'anneau, le fond de carte.
from PIL import Image
import os, math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def prof(px,ox,oy,f,cx,cy):
    X=PX(cx,ox,f);Y=PX(cy,oy,f);out=[]
    for R in [2,5,8,11,14,17,20,23,26,29,32,34]:
        rr=R*f;v=[]
        for k in range(1440):
            a=k*math.pi/720.
            x=int(round(X+rr*math.cos(a)));y=int(round(Y+rr*math.sin(a)))
            v.append(px[x,y])
        m=tuple(sorted(k2[i] for k2 in v)[len(v)//2] for i in range(3))
        out.append((R,m))
    return out
REF=[("lt1",100.75,302.75),("lt2",100.75,504.75),("don",77.25,186.00)]
CAP=[("lt1",100.51,299.68),("lt2",100.51,499.65),("don",76.32,184.01)]
for (n1,x1,y1),(n2,x2,y2) in zip(REF,CAP):
    pr=prof(r,0,0,FR,x1,y1); pc=prof(c,CX0,CY0,FC,x2,y2)
    print("\n  %s : R(CSS)  reference        jeu             delta"%n1)
    for (R,a),(R2,b) in zip(pr,pc):
        print("     %2d     (%3d,%3d,%3d)   (%3d,%3d,%3d)   (%+d,%+d,%+d)"%(R,a[0],a[1],a[2],b[0],b[1],b[2],b[0]-a[0],b[1]-a[1],b[2]-a[2]))
