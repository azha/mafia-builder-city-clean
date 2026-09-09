# m12 — TEXTES : bbox d'encre a seuil MI-CHEMIN (lum_texte+lum_fond)/2 mesure sur chaque image,
# hauteur de capitale, couleur de coeur (mediane des px les plus clairs), contraste WCAG.
# Controle positif : sur la reference le titre doit rendre 18,5 CSS de capitale (valeur du tour
# precedent) et sa couleur #f2c96b=(242,201,107). Controle negatif : le sous-titre est plus petit
# et plus terne -> l'instrument doit les separer.
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
def lin(u):
    u/=255.0
    return u/12.92 if u<=0.04045 else ((u+0.055)/1.055)**2.4
def Lrel(p): return .2126*lin(p[0])+.7152*lin(p[1])+.0722*lin(p[2])
def contraste(a,b):
    la,lb=Lrel(a),Lrel(b)
    if la<lb: la,lb=lb,la
    return (la+.05)/(lb+.05)

def analyse(nom,px,ox,oy,f,x0,y0,x1,y1):
    X0,Y0,X1,Y1=PX(x0,ox,f),PX(y0,oy,f),PX(x1,ox,f),PX(y1,oy,f)
    vals=[]
    for y in range(Y0,Y1):
        for x in range(X0,X1):
            vals.append((lum(px[x,y]),x,y))
    vals.sort()
    n=len(vals)
    fond=vals[int(n*0.15)][0]           # 15e centile = fond
    encre=vals[int(n*0.995)][0]         # coeur du texte
    seuil=(fond+encre)/2.0
    sel=[(x,y) for l,x,y in vals if l>seuil]
    if not sel: print("  %-22s rien"%nom); return None
    xs=[p[0] for p in sel]; ys=[p[1] for p in sel]
    # couleur de coeur : mediane des 5% les plus clairs
    top=[ (px[x,y]) for l,x,y in vals[int(n*0.995):] ]
    coul=tuple(sorted(k[i] for k in top)[len(top)//2] for i in range(3))
    # couleur de fond : mediane des 15% les plus sombres
    bas=[ (px[x,y]) for l,x,y in vals[:max(1,int(n*0.10))] ]
    cfond=tuple(sorted(k[i] for k in bas)[len(bas)//2] for i in range(3))
    print("  %-22s x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)  coul %s  fond %s  contraste %.2f:1"%(
        nom,(min(xs)-ox)/f,(max(xs)-ox)/f,(max(xs)-min(xs)+1)/f,
        (min(ys)-oy)/f,(max(ys)-oy)/f,(max(ys)-min(ys)+1)/f,coul,cfond,contraste(coul,cfond)))
    return dict(x0=(min(xs)-ox)/f,x1=(max(xs)-ox)/f,y0=(min(ys)-oy)/f,y1=(max(ys)-oy)/f,coul=coul,fond=cfond)

print("\n===== REFERENCE =====")
analyse("titre",r,0,0,FR,95,25,540,60)
analyse("sous-titre",r,0,0,FR,95,70,540,98)
analyse("don.nom",r,0,0,FR,130,155,400,185)
analyse("don.role",r,0,0,FR,130,190,400,215)
analyse("rang1.nom",r,0,0,FR,150,275,470,305)
analyse("rang1.pastille-txt",r,0,0,FR,160,305,250,330)
analyse("rang1.etat.val",r,0,0,FR,430,275,530,305)
analyse("rang1.etat.lib",r,0,0,FR,455,308,530,326)
analyse("vide1.txt",r,0,0,FR,150,385,450,420)
analyse("recruter.txt",r,0,0,FR,100,850,470,890)

print("\n===== CAPTURE =====")
analyse("titre",c,CX0,CY0,FC,95,25,540,60)
analyse("sous-titre",c,CX0,CY0,FC,95,70,540,98)
analyse("don.nom",c,CX0,CY0,FC,130,155,400,185)
analyse("don.role",c,CX0,CY0,FC,130,190,400,215)
analyse("rang1.nom",c,CX0,CY0,FC,150,272,470,302)
analyse("rang1.archetype",c,CX0,CY0,FC,150,303,240,330)
analyse("rang1.pastille-txt",c,CX0,CY0,FC,255,303,340,330)
analyse("rang1.etat.val",c,CX0,CY0,FC,380,272,530,302)
analyse("rang1.etat.lib",c,CX0,CY0,FC,455,305,530,326)
analyse("vide1.txt",c,CX0,CY0,FC,150,385,450,420)
analyse("recruter.txt",c,CX0,CY0,FC,100,870,470,915)
