# m31 — anneau du medaillon du DON : PIC de couleur (le plus clair du profil perpendiculaire) sur
# 8 directions, plutot qu'une mediane de bande (un trait de 1,87 CSS n'occupe pas le meme nombre de
# px a x2,00 et a x1,88). Controle positif : l'anneau du LIEUTENANT doit rendre #b08d3e=(176,141,62)
# des deux cotes ; l'anneau du Don doit rendre #f2c96b=(242,201,107).
from PIL import Image
import os, math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]
def pic(nom,px,ox,oy,f,cx,cy,R):
    X=PX(cx,ox,f);Y=PX(cy,oy,f);pics=[]
    for k in range(8):
        a=k*math.pi/4.
        best=None
        for t in range(-8,9):
            rr=(R+t*0.25)*f
            x=int(round(X+rr*math.cos(a)));y=int(round(Y+rr*math.sin(a)))
            p=px[x,y]
            if best is None or lum(p)>lum(best): best=p
        pics.append(best)
    m=tuple(sorted(k2[i] for k2 in pics)[len(pics)//2] for i in range(3))
    print("  %-22s pic median %s   (8 directions : %s)"%(nom,m," ".join("%d"%lum(p) for p in pics)))
pic("ref anneau lieutenant",r,0,0,FR,100.75,302.75,34.8)
pic("cap anneau lieutenant",c,CX0,CY0,FC,100.51,299.68,34.8)
pic("ref anneau DON",r,0,0,FR,77.25,186.00,34.8)
pic("cap anneau DON",c,CX0,CY0,FC,76.32,184.01,34.8)
