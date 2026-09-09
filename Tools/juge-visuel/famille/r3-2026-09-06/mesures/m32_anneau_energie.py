# m32 — ENERGIE de trait des anneaux de medaillon (integrale de l'exces de luminance sur un profil
# radial, insensible a la PHASE d'echantillonnage, contrairement au pic). Ligne de base = moyenne des
# extremites du profil. Controle positif : les deux anneaux de lieutenant (memes couleurs) doivent
# rendre la meme energie a l'interieur d'une meme image.
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
def energie(nom,px,ox,oy,f,cx,cy,R):
    X=PX(cx,ox,f);Y=PX(cy,oy,f);tot=[]
    for k in range(16):
        a=k*math.pi/8.
        prof=[]
        for t in range(-14,15):
            rr=(R+t*0.25)*f
            x=int(round(X+rr*math.cos(a)));y=int(round(Y+rr*math.sin(a)))
            prof.append(lum(px[x,y]))
        base=(prof[0]+prof[1]+prof[-1]+prof[-2])/4.
        tot.append(sum(max(0,v-base) for v in prof)*0.25)
    tot.sort()
    print("  %-24s energie mediane %.1f (par px CSS)"%(nom,tot[len(tot)//2]))
    return tot[len(tot)//2]
a=energie("ref lieutenant 1",r,0,0,FR,100.75,302.75,34.9)
b=energie("ref lieutenant 2",r,0,0,FR,100.75,504.75,34.9)
d=energie("cap lieutenant 1",c,CX0,CY0,FC,100.51,299.68,34.9)
e=energie("cap lieutenant 2",c,CX0,CY0,FC,100.51,499.65,34.9)
g=energie("ref DON",r,0,0,FR,77.25,186.00,34.9)
h=energie("cap DON",c,CX0,CY0,FC,76.32,184.01,34.9)
print("  ratio jeu/reference : lieutenant %.2f / %.2f   don %.2f"%(d/a,e/b,h/g))
