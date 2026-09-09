# m30 — FORME du buste de lieutenant : largeur de l'encre creme par ligne (en % du disque) et bbox du
# TROU du visage (fill-rule evenodd de la capuche). Repere : disque = anneau mesure en m14/m15.
# Controle positif : la couleur de l'encre est #cfc4a6 des deux cotes (m28). Controle negatif : la
# meme mesure hors du disque ne rend aucune encre.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def creme(p): return p[0]>150 and p[1]>140 and p[2]>110 and abs(p[0]-p[1])<40

def largeurs(nom,px,ox,oy,f,cx,cy,R):
    X=PX(cx,ox,f);Y=PX(cy,oy,f);RR=R*f
    print("  %s (0%%=haut du disque, 100%%=bas) :"%nom)
    for pct in range(35,100,5):
        y=int(round(Y-RR+2*RR*pct/100.))
        xs=[x for x in range(int(X-RR),int(X+RR)+1) if creme(px[x,y])]
        if xs:
            print("     %3d%%  x %5.1f%%..%5.1f%%  largeur %5.1f%%"%(pct,100*(min(xs)-(X-RR))/(2*RR),
                  100*(max(xs)-(X-RR))/(2*RR),100*(max(xs)-min(xs)+1)/(2*RR)))
        else:
            print("     %3d%%  (rien)"%pct)

def trou(nom,px,ox,oy,f,cx,cy,R):
    # trou = pixels NON cremes entierement entoures de creme sur la meme ligne, dans la moitie haute
    X=PX(cx,ox,f);Y=PX(cy,oy,f);RR=R*f
    xs=[];ys=[]
    for y in range(int(Y-RR),int(Y+RR)):
        ligne=[x for x in range(int(X-RR),int(X+RR)+1) if creme(px[x,y])]
        if len(ligne)<4: continue
        a,b=min(ligne),max(ligne)
        for x in range(a+1,b):
            if not creme(px[x,y]): xs.append(x);ys.append(y)
    if not xs: print("  %-22s aucun trou"%nom); return
    print("  %-22s trou x %.1f%%..%.1f%% (l=%.1f%%)  y %.1f%%..%.1f%% (h=%.1f%%)  aire %d px"%(nom,
      100*(min(xs)-(X-RR))/(2*RR),100*(max(xs)-(X-RR))/(2*RR),100*(max(xs)-min(xs)+1)/(2*RR),
      100*(min(ys)-(Y-RR))/(2*RR),100*(max(ys)-(Y-RR))/(2*RR),100*(max(ys)-min(ys)+1)/(2*RR),len(xs)))

largeurs("REFERENCE lieutenant 1",r,0,0,FR,100.75,302.75,35.5)
largeurs("JEU       lieutenant 1",c,CX0,CY0,FC,100.51,299.68,35.5)
print()
trou("ref lieutenant 1",r,0,0,FR,100.75,302.75,35.5)
trou("cap lieutenant 1",c,CX0,CY0,FC,100.51,299.68,35.5)
trou("ref lieutenant 2",r,0,0,FR,100.75,504.75,35.5)
trou("cap lieutenant 2",c,CX0,CY0,FC,100.51,499.65,35.5)
trou("ref don",r,0,0,FR,77.25,186.00,35.5)
trou("cap don",c,CX0,CY0,FC,76.32,184.01,35.5)

print("\n== ANNEAU laiton : epaisseur et couleur (profil horizontal a hauteur du centre) ==")
def anneau(nom,px,ox,oy,f,cx,cy):
    Y=PX(cy,oy,f); out=[]
    for x in range(PX(cx-40,ox,f),PX(cx-28,ox,f)):
        p=px[x,Y]
        if p[0]>p[2]+30 and p[0]>90: out.append((x,p))
    if out:
        print("  %-18s epaisseur %.2f CSS  couleur au coeur %s"%(nom,(out[-1][0]-out[0][0]+1)/f,out[len(out)//2][1]))
anneau("ref lieutenant",r,0,0,FR,100.75,302.75)
anneau("cap lieutenant",c,CX0,CY0,FC,100.51,299.68)
anneau("ref don",r,0,0,FR,77.25,186.00)
anneau("cap don",c,CX0,CY0,FC,76.32,184.01)
