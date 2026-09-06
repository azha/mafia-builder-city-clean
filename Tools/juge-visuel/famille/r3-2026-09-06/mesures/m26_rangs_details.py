# m26 — details des rangs : haut/bas de carte (par le lisere interne haut et le lisere interne bas),
# hauteur, ecart medaillon->nom, bloc etat (bord droit d'encre, interligne), nom de rang (capitale),
# et difference .rang.actif / .rang a la REFERENCE (pour savoir si l'etat "actif" est visible).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]
def medrow(px,ox,oy,f,cssy,x0,x1):
    y=PX(cssy,oy,f); v=[lum(px[x,y]) for x in range(PX(x0,ox,f),PX(x1,ox,f))]
    v.sort(); return v[len(v)//2]

print("\n== HAUT et BAS des cartes (max puis min de luminance sur la bande x CSS 250..430) ==")
def carte(nom,px,ox,oy,f,ya,yb):
    ys=[ya+i*0.25 for i in range(int((yb-ya)/0.25))]
    prof=[(y,medrow(px,ox,oy,f,y,250,430)) for y in ys]
    haut=max(prof[:int(len(prof)*0.25)],key=lambda t:t[1])
    bas =min(prof[int(len(prof)*0.75):],key=lambda t:t[1])
    print("  %-16s lisere haut y=%.2f (L=%.1f)   lisere bas y=%.2f (L=%.1f)   hauteur %.2f"%(
        nom,haut[0],haut[1],bas[0],bas[1],bas[0]-haut[0]+1))
    return haut[0],bas[0]
R=[carte("ref rang%d"%(i+1),r,0,0,FR,a,b) for i,(a,b) in enumerate([(250,360),(452,562),(627,737)])]
C=[carte("cap rang%d"%(i+1),c,CX0,CY0,FC,a,b) for i,(a,b) in enumerate([(247,357),(448,558),(650,760)])]
print("  pas rang->rang : reference %.2f / %.2f   jeu %.2f / %.2f"%(R[1][0]-R[0][0],R[2][0]-R[1][0],C[1][0]-C[0][0],C[2][0]-C[1][0]))
print("  don-rang :")
carte("ref don-rang",r,0,0,FR,133,240)
carte("cap don-rang",c,CX0,CY0,FC,131,238)

print("\n== BLOC ETAT : bord droit d'encre et positions ==")
def encre(nom,px,ox,oy,f,x0,y0,x1,y1):
    X0,Y0,X1,Y1=PX(x0,ox,f),PX(y0,oy,f),PX(x1,ox,f),PX(y1,oy,f)
    vals=[]
    for y in range(Y0,Y1):
        for x in range(X0,X1): vals.append((lum(px[x,y]),x,y))
    vals.sort(); n=len(vals)
    s=vals[int(n*0.15)][0]+(vals[int(n*0.995)][0]-vals[int(n*0.15)][0])*0.5
    sel=[(x,y) for l,x,y in vals if l>s]
    xs=[p[0] for p in sel]; ys=[p[1] for p in sel]
    print("  %-26s x %.2f..%.2f   y %.2f..%.2f"%(nom,(min(xs)-ox)/f,(max(xs)-ox)/f,(min(ys)-oy)/f,(max(ys)-oy)/f))
    return (min(xs)-ox)/f,(max(xs)-ox)/f,(min(ys)-oy)/f,(max(ys)-oy)/f
for i,(ya,yb) in enumerate([(280,304),(482,506),(657,681)]):
    encre("ref rang%d valeur"%(i+1),r,0,0,FR,420,ya,535,yb)
for i,(ya,yb) in enumerate([(304,326),(506,528),(681,703)]):
    encre("ref rang%d libelle"%(i+1),r,0,0,FR,440,ya,535,yb)
for i,(ya,yb) in enumerate([(278,302),(479,503),(680,704)]):
    encre("cap rang%d valeur"%(i+1),c,CX0,CY0,FC,400,ya,535,yb)
for i,(ya,yb) in enumerate([(302,322),(503,523),(704,724)]):
    encre("cap rang%d libelle"%(i+1),c,CX0,CY0,FC,440,ya,535,yb)

print("\n== NOM du rang : bbox par rang ==")
for i,(ya,yb) in enumerate([(274,305),(476,507),(651,682)]):
    encre("ref rang%d nom"%(i+1),r,0,0,FR,150,ya,420,yb)
for i,(ya,yb) in enumerate([(270,300),(471,501),(672,702)]):
    encre("cap rang%d nom"%(i+1),c,CX0,CY0,FC,150,ya,400,yb)

print("\n== REFERENCE : .rang.actif (rang1) vs .rang (rang2) — fond au meme point relatif ==")
def fond(nom,px,ox,oy,f,ytop,dy,x0,x1):
    v=[]
    for y in range(PX(ytop+dy,oy,f),PX(ytop+dy+4,oy,f)):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)): v.append(px[x,y])
    m=tuple(sorted(k[i] for k in v)[len(v)//2] for i in range(3))
    print("  %-30s %s"%(nom,m)); return m
for dy in [8,30,55,80,95]:
    a=fond("ref rang1(actif) dy=%d"%dy,r,0,0,FR,252.8,dy,330,430)
    b=fond("ref rang2       dy=%d"%dy,r,0,0,FR,454.3,dy,330,430)
    d=fond("cap rang1       dy=%d"%dy,c,CX0,CY0,FC,249.7,dy,330,430)
    e=fond("cap rang2       dy=%d"%dy,c,CX0,CY0,FC,451.3,dy,330,430)
    print("     -> ref actif-normal %s | jeu rang1-rang2 %s"%(tuple(a[i]-b[i] for i in range(3)),tuple(d[i]-e[i] for i in range(3))))
