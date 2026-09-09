# m20 — (a) boites POINTILLEES : geometrie, periode du pointille, couleur du trait ;
#       (b) RAIL principal (.arbre::before) : x, largeur, rampe de couleur a t=0,25/0,50/0,75 ;
#       (c) RAIL d'equipe (.equipe::before) et son ergot ; ergot du rang (.rang::before).
# Controle positif : l'ergot du rang mesure 16,8 CSS de long (valeur CSS) des deux cotes.
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

print("\n=== (a) BOITES POINTILLEES ===")
def pointille(nom,px,ox,oy,f,cssy,x0,x1,bl):
    y=PX(cssy,oy,f)
    on=[]
    for x in range(PX(x0,ox,f),PX(x1,ox,f)):
        v=max(lum(px[x,y-1]),lum(px[x,y]),lum(px[x,y+1]))
        on.append(v>bl+6)
    # periode : transitions off->on
    tr=[i for i in range(1,len(on)) if on[i] and not on[i-1]]
    per=[(tr[i+1]-tr[i])/f for i in range(len(tr)-1)]
    per.sort()
    tot=sum(1 for v in on if v)
    print("  %-24s traits=%d  periode mediane=%.2f CSS  taux d'occupation=%.0f%%"%(nom,len(tr),
        (per[len(per)//2] if per else -1),100.*tot/len(on)))
pointille("ref vide1 (bord haut)",r,0,0,FR,368.75,200,530,24.5)
pointille("cap vide1 (bord haut)",c,CX0,CY0,FC,365.6,200,530,22.4)
pointille("ref recruter (bord haut)",r,0,0,FR,835.25,60,530,24.5)
pointille("cap recruter (bord haut)",c,CX0,CY0,FC,858.3,60,530,22.4)

def boite(nom,px,ox,oy,f,ya,yb,xa,xb,bl):
    xs=[];ys=[]
    for y in range(PX(ya,oy,f),PX(yb,oy,f)):
        for x in range(PX(xa,ox,f),PX(xb,ox,f)):
            if lum(px[x,y])>bl+6: xs.append(x);ys.append(y)
    print("  %-24s x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)"%(nom,(min(xs)-ox)/f,(max(xs)-ox)/f,
        (max(xs)-min(xs)+1)/f,(min(ys)-oy)/f,(max(ys)-oy)/f,(max(ys)-min(ys)+1)/f))
print("  -- bbox des boites (bord pointille compris) --")
boite("ref vide1",r,0,0,FR,362,446,60,545,24.5)
boite("cap vide1",c,CX0,CY0,FC,360,442,60,545,22.4)
boite("ref recruter",r,0,0,FR,828,912,15,548,24.5)
boite("cap recruter",c,CX0,CY0,FC,852,935,15,548,22.4)

print("\n=== (b) RAIL PRINCIPAL (.arbre::before) ===")
def rail(nom,px,ox,oy,f,cssy,xa,xb,bl):
    y=PX(cssy,oy,f)
    xs=[x for x in range(PX(xa,ox,f),PX(xb,ox,f)) if lum(px[x,y])>bl+8]
    if not xs: print("  %-26s rien"%nom); return
    m=tuple(sorted(px[x,y][i] for x in xs)[len(xs)//2] for i in range(3))
    print("  %-26s x %.2f..%.2f (l=%.2f)  couleur %s"%(nom,(min(xs)-ox)/f,(max(xs)-ox)/f,(max(xs)-min(xs)+1)/f,m))
# .arbre : top = don-rang bottom + gap 14.93 - 11.2 ; bottom = fin arbre - 18.67
for t,lab in [(0.25,"t=0,25"),(0.5,"t=0,50"),(0.75,"t=0,75")]:
    yr=250+t*(800-250); yc=248+t*(838-248)
    rail("ref rail %s"%lab,r,0,0,FR,yr,26,42,24.5)
    rail("cap rail %s"%lab,c,CX0,CY0,FC,yc,26,42,22.4)

print("\n=== (c) ERGOT du rang (.rang::before, 16,8 CSS) et RAIL d'equipe ===")
def ergot(nom,px,ox,oy,f,cssy,bl):
    y=PX(cssy,oy,f)
    xs=[x for x in range(PX(26,ox,f),PX(56,ox,f)) if lum(px[x,y])>bl+8]
    if not xs: print("  %-24s rien"%nom); return
    m=tuple(sorted(px[x,y][i] for x in xs)[len(xs)//2] for i in range(3))
    print("  %-24s x %.2f..%.2f  longueur %.2f  couleur %s"%(nom,(min(xs)-ox)/f,(max(xs)-ox)/f,(max(xs)-min(xs)+1)/f,m))
ergot("ref rang1",r,0,0,FR,303.0,24.5)
ergot("cap rang1",c,CX0,CY0,FC,299.7,22.4)
ergot("ref rang2",r,0,0,FR,504.5,24.5)
ergot("cap rang2",c,CX0,CY0,FC,501.5,22.4)
def railq(nom,px,ox,oy,f,cssy,bl):
    y=PX(cssy,oy,f)
    xs=[x for x in range(PX(60,ox,f),PX(90,ox,f)) if lum(px[x,y])>bl+6]
    if not xs: print("  %-24s rien"%nom); return
    m=tuple(sorted(px[x,y][i] for x in xs)[len(xs)//2] for i in range(3))
    print("  %-24s x %.2f..%.2f  largeur %.2f  couleur %s"%(nom,(min(xs)-ox)/f,(max(xs)-ox)/f,(max(xs)-min(xs)+1)/f,m))
railq("ref rail equipe 1",r,0,0,FR,400,24.5)
railq("cap rail equipe 1",c,CX0,CY0,FC,400,22.4)
