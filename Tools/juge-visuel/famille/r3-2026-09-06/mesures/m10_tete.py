# m10 — la TETE : bloc titre/sous-titre (bbox d'encre, hauteur de capitale), filet, bouton retour,
# et PROFIL du fond de tete (radial-gradient .tete). Repere : capture (13,232) f=1053/560 ;
# reference (0,0) f=2. Controle positif : la hauteur de capitale du titre est de 18,5 CSS a la ref
# (grandeur mesuree au tour precedent) ; controle negatif : le sous-titre est plus petit.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0
FR=2.0
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]

def bbox_encre(px,x0,y0,x1,y1,seuil):
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(px[x,y])>seuil: xs.append(x);ys.append(y)
    if not xs: return None
    return min(xs),min(ys),max(xs),max(ys)

def PX(v,o,f): return int(round(o+v*f))

print("\n== bbox d'encre du TITRE (bande CSS x 95..540) ==")
b=bbox_encre(r,PX(95,0,FR),PX(20,0,FR),PX(540,0,FR),PX(58,0,FR),90)
print("  ref px",b,"CSS x %.2f..%.2f y %.2f..%.2f  cap-h %.2f"%(b[0]/FR,b[2]/FR,b[1]/FR,b[3]/FR,(b[3]-b[1]+1)/FR))
b2=bbox_encre(c,PX(95,CX0,FC),PX(20,CY0,FC),PX(540,CX0,FC),PX(58,CY0,FC),90)
print("  cap px",b2,"CSS x %.2f..%.2f y %.2f..%.2f  cap-h %.2f"%((b2[0]-CX0)/FC,(b2[2]-CX0)/FC,(b2[1]-CY0)/FC,(b2[3]-CY0)/FC,(b2[3]-b2[1]+1)/FC))

print("\n== bbox d'encre du SOUS-TITRE (bande CSS x 95..540, y 60..100) ==")
b=bbox_encre(r,PX(95,0,FR),PX(60,0,FR),PX(540,0,FR),PX(100,0,FR),70)
print("  ref px",b,"CSS x %.2f..%.2f y %.2f..%.2f  cap-h %.2f"%(b[0]/FR,b[2]/FR,b[1]/FR,b[3]/FR,(b[3]-b[1]+1)/FR))
b2=bbox_encre(c,PX(95,CX0,FC),PX(60,CY0,FC),PX(540,CX0,FC),PX(100,CY0,FC),70)
print("  cap px",b2,"CSS x %.2f..%.2f y %.2f..%.2f  cap-h %.2f"%((b2[0]-CX0)/FC,(b2[2]-CX0)/FC,(b2[1]-CY0)/FC,(b2[3]-CY0)/FC,(b2[3]-b2[1]+1)/FC))

print("\n== bouton RETOUR : bbox de l'anneau (bande CSS x 15..80, y 15..85) ==")
def anneau(px,ox,oy,f,seuil):
    xs=[];ys=[]
    for y in range(PX(12,oy,f),PX(88,oy,f)):
        for x in range(PX(12,ox,f),PX(88,ox,f)):
            if lum(px[x,y])>seuil: xs.append(x);ys.append(y)
    return (min(xs),min(ys),max(xs),max(ys)) if xs else None
a=anneau(r,0,0,FR,32); print("  ref",a,"CSS %.2f..%.2f x %.2f..%.2f  diam %.2f x %.2f"%(a[0]/FR,a[2]/FR,a[1]/FR,a[3]/FR,(a[2]-a[0]+1)/FR,(a[3]-a[1]+1)/FR))
a2=anneau(c,CX0,CY0,FC,32); print("  cap",a2,"CSS %.2f..%.2f x %.2f..%.2f  diam %.2f x %.2f"%((a2[0]-CX0)/FC,(a2[2]-CX0)/FC,(a2[1]-CY0)/FC,(a2[3]-CY0)/FC,(a2[2]-a2[0]+1)/FC,(a2[3]-a2[1]+1)/FC))

print("\n== PROFIL du fond de tete : colonne x=CSS 280 (centre), hors texte : on prend le MIN de la bande x CSS 545..556 ? non ->")
print("   on prend la MEDIANE de la bande x CSS 5..20 (marge gauche, hors bouton) par ligne")
for cssy in [2,6,10,15,20,30,40,50,60,70,80,90,100,110,113,118,125,130]:
    yr=PX(cssy,0,FR); yc=PX(cssy,CY0,FC)
    def med(px,ox,f,y):
        v=[[],[],[]]
        for x in range(PX(4,ox,f),PX(19,ox,f)):
            p=px[x,y]
            for i in range(3): v[i].append(p[i])
        return tuple(sorted(k)[len(k)//2] for k in v)
    print("  CSS y=%-5s ref %s   cap %s"%(cssy,med(r,0,FR,yr),med(c,CX0,FC,yc)))
