# m15 — medaillon du DON : fenetre restreinte (x CSS 30..125) pour ne pas ramasser le nom en or-vif.
# Halo : integrale d'exces du canal R sur des anneaux concentriques, MOINS le meme profil pris sur un
# medaillon de LIEUTENANT (controle negatif : pas de box-shadow dans .medl, seulement dans .medl.don).
# Controle positif : diametre attendu 70,93 CSS ; controle negatif : le net du lieutenant contre
# lui-meme doit valoir ~0.
from PIL import Image
import os, math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))

def anneau_bbox(nom,px,ox,oy,f,x0,y0,x1,y1):
    xs=[];ys=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)):
            p=px[x,y]
            if p[0]>p[2]+30 and p[0]>90: xs.append(x);ys.append(y)
    a,b,d,e=min(xs),min(ys),max(xs),max(ys)
    print("  %-18s x %.2f..%.2f (D=%.2f)  y %.2f..%.2f (D=%.2f)  centre CSS (%.2f,%.2f)"%(nom,
        (a-ox)/f,(d-ox)/f,(d-a+1)/f,(b-oy)/f,(e-oy)/f,(e-b+1)/f,((a+d)/2.-ox)/f,((b+e)/2.-oy)/f))
    return (((a+d)/2.-ox)/f, ((b+e)/2.-oy)/f, (d-a+1)/f/2.)

print("\n== ANNEAUX ==")
rd=anneau_bbox("ref don",r,0,0,FR,30,145,125,230)
cd_=anneau_bbox("cap don",c,CX0,CY0,FC,30,145,125,230)
rl=anneau_bbox("ref lieut1",r,0,0,FR,55,265,145,350)
cl=anneau_bbox("cap lieut1",c,CX0,CY0,FC,55,262,145,348)
rl2=anneau_bbox("ref lieut3",r,0,0,FR,55,615,145,700)
cl2=anneau_bbox("cap lieut3",c,CX0,CY0,FC,55,640,145,725)

def buste(nom,px,ox,oy,f,cx,cy,R):
    X=PX(cx,ox,f); Y=PX(cy,oy,f); RR=int(R*f)
    xs=[];ys=[];n=0
    for y in range(Y-RR,Y+RR+1):
        for x in range(X-RR,X+RR+1):
            if (x-X)**2+(y-Y)**2 > (RR-int(3*f))**2: continue
            p=px[x,y]
            if p[0]>150 and p[1]>140 and p[2]>110 and abs(p[0]-p[1])<40: xs.append(x);ys.append(y);n+=1
    a,b,d,e=min(xs),min(ys),max(xs),max(ys); Dd=2.0*RR
    print("  %-18s x %.1f..%.1f  y %.1f..%.1f  epaules %.1f%%  aire %.2f%%"%(nom,
        100.*(a-(X-RR))/Dd,100.*(d-(X-RR))/Dd,100.*(b-(Y-RR))/Dd,100.*(e-(Y-RR))/Dd,100.*(d-a+1)/Dd,100.*n/(math.pi*RR*RR)))

print("\n== BUSTES ==")
buste("ref don",r,0,0,FR,rd[0],rd[1],35.5)
buste("cap don",c,CX0,CY0,FC,cd_[0],cd_[1],35.5)
buste("ref lieutenant",r,0,0,FR,rl[0],rl[1],35.5)
buste("cap lieutenant",c,CX0,CY0,FC,cl[0],cl[1],35.5)

def profilR(px,ox,oy,f,cx,cy,Rdeb):
    X=PX(cx,ox,f); Y=PX(cy,oy,f); out=[]
    for d in range(0,22):
        rr=(Rdeb+d)*f; vals=[]
        for k in range(0,1440):
            a=k*math.pi/720.
            x=int(round(X+rr*math.cos(a))); y=int(round(Y+rr*math.sin(a)))
            if 0<=x<px_w and 0<=y<px_h: vals.append(px[x,y][0])
        vals.sort(); out.append(vals[len(vals)//2])
    return out

px_w,px_h=1120,1850
pr_d=profilR(r,0,0,FR,rd[0],rd[1],36.5)
pr_l=profilR(r,0,0,FR,rl[0],rl[1],36.5)
pr_l2=profilR(r,0,0,FR,rl2[0],rl2[1],36.5)
px_w,px_h=1080,2400
pc_d=profilR(c,CX0,CY0,FC,cd_[0],cd_[1],36.5)
pc_l=profilR(c,CX0,CY0,FC,cl[0],cl[1],36.5)
pc_l2=profilR(c,CX0,CY0,FC,cl2[0],cl2[1],36.5)

print("\n== HALO : canal R median a d CSS au-dela du bord de l'anneau ==")
print("  d   refDon refLt net | capDon capLt net | (controle negatif : refLt3-refLt1, capLt3-capLt1)")
sr=sc=0.0; sn_r=sn_c=0.0
for d in range(22):
    nr=pr_d[d]-pr_l[d]; nc=pc_d[d]-pc_l[d]
    gr=pr_l2[d]-pr_l[d]; gc=pc_l2[d]-pc_l[d]
    sr+=nr; sc+=nc; sn_r+=gr; sn_c+=gc
    print("  %2d   %3d  %3d  %+4d |  %3d  %3d  %+4d |  %+3d %+3d"%(d,pr_d[d],pr_l[d],nr,pc_d[d],pc_l[d],nc,gr,gc))
print("\n  integrale net (d=0..21) : reference %.1f  jeu %.1f  ratio %.2f"%(sr,sc,(sc/sr if sr else 0)))
print("  controle negatif (lieut3 - lieut1) : reference %.1f  jeu %.1f"%(sn_r,sn_c))
