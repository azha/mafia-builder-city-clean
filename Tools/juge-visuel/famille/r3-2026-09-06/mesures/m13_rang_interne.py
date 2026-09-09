# m13 — rang 1 : geometrie interne. Boite de la pastille (bordure cyan), hauteur de capitale du nom
# (colonne de la 1re lettre), interligne nom->pastille, bloc etat (valeur/libelle) et son interligne.
# Controle positif : la pastille de la REFERENCE doit faire 28,0 CSS de haut (valeur du tour
# precedent) ; controle negatif : la meme recherche sur une bande sans pastille ne rend rien.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def cy(v,f): return v  # helper

def cyan_bbox(nom,px,ox,oy,f,x0,y0,x1,y1):
    # pixel "cyan" : B et G nettement > R
    xs=[];ys=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)):
            p=px[x,y]
            if p[2]>p[0]+18 and p[1]>p[0]+12 and p[2]>60: xs.append(x);ys.append(y)
    if not xs: print("  %-24s rien"%nom); return None
    print("  %-24s x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)"%(nom,(min(xs)-ox)/f,(max(xs)-ox)/f,
        (max(xs)-min(xs)+1)/f,(min(ys)-oy)/f,(max(ys)-oy)/f,(max(ys)-min(ys)+1)/f))
    return (min(xs),min(ys),max(xs),max(ys))

print("\n== PASTILLE (bordure+texte cyan) ==")
for i,(ya,yb) in enumerate([(300,340),(500,545),(675,720)]):
    cyan_bbox("ref rang%d"%(i+1),r,0,0,FR,140,ya,420,yb)
for i,(ya,yb) in enumerate([(298,338),(500,540),(700,740)]):
    cyan_bbox("cap rang%d"%(i+1),c,CX0,CY0,FC,140,ya,420,yb)
print("-- controle negatif : bande du don-rang (aucune pastille) --")
cyan_bbox("ref don-rang",r,0,0,FR,140,150,420,230)
cyan_bbox("cap don-rang",c,CX0,CY0,FC,140,150,420,230)

def encre_bbox(nom,px,ox,oy,f,x0,y0,x1,y1,pct=0.5):
    import math
    vals=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)):
            p=px[x,y]; vals.append((.2126*p[0]+.7152*p[1]+.0722*p[2],x,y))
    vals.sort(); n=len(vals)
    fond=vals[int(n*0.15)][0]; encre=vals[int(n*0.995)][0]; s=fond+(encre-fond)*pct
    sel=[(x,y) for l,x,y in vals if l>s]
    if not sel: print("  %-24s rien"%nom); return None
    xs=[p[0] for p in sel]; ys=[p[1] for p in sel]
    print("  %-24s x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)"%(nom,(min(xs)-ox)/f,(max(xs)-ox)/f,
        (max(xs)-min(xs)+1)/f,(min(ys)-oy)/f,(max(ys)-oy)/f,(max(ys)-min(ys)+1)/f))
    return (min(xs),min(ys),max(xs),max(ys))

print("\n== NOM du rang : 1re lettre seule (hauteur de capitale sans jambage) ==")
encre_bbox("ref rang1 'C' de Comptable",r,0,0,FR,153,272,171,308)
encre_bbox("cap rang1 'L' de Lt.",c,CX0,CY0,FC,153,268,170,305)
print("\n== NOM du rang : mot entier ==")
encre_bbox("ref rang1 nom",r,0,0,FR,150,272,400,308)
encre_bbox("cap rang1 nom",c,CX0,CY0,FC,150,268,400,305)
print("\n== BLOC ETAT ==")
encre_bbox("ref rang1 valeur",r,0,0,FR,420,275,535,305)
encre_bbox("ref rang1 libelle",r,0,0,FR,420,306,535,328)
encre_bbox("cap rang1 valeur",c,CX0,CY0,FC,400,272,535,303)
encre_bbox("cap rang1 libelle",c,CX0,CY0,FC,400,304,535,326)
print("\n== ARCHETYPE (capture seulement, absent de la reference) ==")
encre_bbox("cap rang1 archetype",c,CX0,CY0,FC,150,306,240,330)
