# m14 — medaillons : diametre/centre de l'anneau laiton, bbox du buste en % du disque, et HALO du
# medaillon du Don (box-shadow 0 0 14.93px #d9ab4e33), mesure comme integrale d'exces du canal R
# a l'exterieur de l'anneau, MOINS un controle negatif pris sur un medaillon de lieutenant (qui n'a
# pas de box-shadow). Controle positif : diametre attendu 70,93 CSS des deux cotes.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))

def anneau_bbox(nom,px,ox,oy,f,x0,y0,x1,y1):
    # l'anneau est laiton/or : R nettement > B
    xs=[];ys=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)):
            p=px[x,y]
            if p[0]>p[2]+30 and p[0]>90: xs.append(x);ys.append(y)
    if not xs: print("  %-22s rien"%nom); return None
    a,b,d,e=min(xs),min(ys),max(xs),max(ys)
    print("  %-22s x %.2f..%.2f (D=%.2f)  y %.2f..%.2f (D=%.2f)  centre (%.2f,%.2f)"%(nom,
        (a-ox)/f,(d-ox)/f,(d-a+1)/f,(b-oy)/f,(e-oy)/f,(e-b+1)/f,((a+d)/2.-ox)/f,((b+e)/2.-oy)/f))
    return (a,b,d,e)

print("\n== ANNEAUX ==")
R1=anneau_bbox("ref don",r,0,0,FR,60,145,145,230)
R2=anneau_bbox("ref rang1",r,0,0,FR,55,265,145,350)
C1=anneau_bbox("cap don",c,CX0,CY0,FC,60,145,145,230)
C2=anneau_bbox("cap rang1",c,CX0,CY0,FC,55,262,145,348)

def buste(nom,px,ox,oy,f,cx,cy,R):
    # buste = pixels creme (#cfc4a6) DANS le disque
    X=PX(cx,ox,f); Y=PX(cy,oy,f); RR=int(R*f)
    xs=[];ys=[];n=0
    for y in range(Y-RR,Y+RR):
        for x in range(X-RR,X+RR):
            if (x-X)**2+(y-Y)**2 > (RR-int(3*f))**2: continue
            p=px[x,y]
            if p[0]>150 and p[1]>140 and p[2]>110 and abs(p[0]-p[1])<40: xs.append(x);ys.append(y);n+=1
    if not xs: print("  %-22s rien"%nom); return
    a,b,d,e=min(xs),min(ys),max(xs),max(ys)
    D=2.0*RR
    print("  %-22s bbox %% du disque : x %.1f..%.1f  y %.1f..%.1f  epaules %.1f%%  aire %.2f%%"%(nom,
        100.*(a-(X-RR))/D,100.*(d-(X-RR))/D,100.*(b-(Y-RR))/D,100.*(e-(Y-RR))/D,
        100.*(d-a+1)/D, 100.*n/(3.14159*RR*RR)))

print("\n== BUSTES (bbox en % du disque) ==")
buste("ref don",r,0,0,FR,(R1[0]+R1[2])/2./FR,(R1[1]+R1[3])/2./FR,35.5)
buste("cap don",c,CX0,CY0,FC,((C1[0]+C1[2])/2.-CX0)/FC,((C1[1]+C1[3])/2.-CY0)/FC,35.5)
buste("ref lieutenant",r,0,0,FR,(R2[0]+R2[2])/2./FR,(R2[1]+R2[3])/2./FR,35.5)
buste("cap lieutenant",c,CX0,CY0,FC,((C2[0]+C2[2])/2.-CX0)/FC,((C2[1]+C2[3])/2.-CY0)/FC,35.5)

def halo(nom,px,ox,oy,f,cx,cy,Rext):
    # profil radial du canal R a l'exterieur de l'anneau (en CSS px depuis le bord de l'anneau)
    X=PX(cx,ox,f); Y=PX(cy,oy,f)
    out=[]
    for d in range(0,20):
        rr=(Rext+d)*f
        vals=[]
        import math
        for k in range(0,720):
            a=k*math.pi/360.
            x=int(round(X+rr*math.cos(a))); y=int(round(Y+rr*math.sin(a)))
            try: vals.append(px[x,y][0])
            except: pass
        vals.sort()
        out.append((d,sorted(vals)[len(vals)//2]))
    return out

print("\n== HALO du medaillon du Don : canal R median sur un anneau a d CSS du bord ==")
hd_r=halo("",r,0,0,FR,(R1[0]+R1[2])/2./FR,(R1[1]+R1[3])/2./FR,35.7)
hl_r=halo("",r,0,0,FR,(R2[0]+R2[2])/2./FR,(R2[1]+R2[3])/2./FR,35.7)
hd_c=halo("",c,CX0,CY0,FC,((C1[0]+C1[2])/2.-CX0)/FC,((C1[1]+C1[3])/2.-CY0)/FC,35.7)
hl_c=halo("",c,CX0,CY0,FC,((C2[0]+C2[2])/2.-CX0)/FC,((C2[1]+C2[3])/2.-CY0)/FC,35.7)
print("  d(CSS)  refDon refLt  (net)   capDon capLt  (net)")
sr=0.0;sc=0.0
for i in range(20):
    nr=hd_r[i][1]-hl_r[i][1]; nc=hd_c[i][1]-hl_c[i][1]
    if i>=1: sr+=nr; sc+=nc
    print("   %2d      %3d    %3d    %+4d     %3d    %3d    %+4d"%(i,hd_r[i][1],hl_r[i][1],nr,hd_c[i][1],hl_c[i][1],nc))
print("  integrale d'exces net (d=1..19) : reference %.1f   jeu %.1f   ratio %.2f"%(sr,sc,(sc/sr if sr else 0)))
