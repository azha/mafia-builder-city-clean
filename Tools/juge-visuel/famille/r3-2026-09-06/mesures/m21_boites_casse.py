# m21 — (a) boites vides : bords GAUCHE/DROIT reels (hors rail d'equipe), hauteur, centrage du texte ;
#       (b) CASSE : instrument par corps de lettre (les accents, blobs separes au-dessus de la bande,
#          sont retires) sur les libelles ETAT / sous-titre / role du Don / nom de rang.
# Controle positif de (b) : le SOUS-TITRE est en capitales des deux cotes (text-transform:uppercase) ;
# controle negatif : le texte de la boite vide est en casse MIXTE des deux cotes.
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

print("\n=== (a) BOITES VIDES : bords reels ===")
def boite(nom,px,ox,oy,f,ya,yb,bl):
    # bord gauche/droit : colonne dont AU MOINS 15% des lignes de la bande sont claires
    ys=range(PX(ya,oy,f),PX(yb,oy,f))
    cols=[]
    for x in range(PX(80,ox,f),PX(550,ox,f)):
        n=sum(1 for y in ys if lum(px[x,y])>bl+6)
        cols.append((x,n))
    seuil=max(n for _,n in cols)*0.35
    xs=[x for x,n in cols if n>=seuil]
    print("  %-22s x %.2f..%.2f  largeur %.2f"%(nom,(min(xs)-ox)/f,(max(xs)-ox)/f,(max(xs)-min(xs)+1)/f))
boite("ref vide1",r,0,0,FR,370,438,24.5)
boite("cap vide1",c,CX0,CY0,FC,367,434,22.4)
boite("ref vide3",r,0,0,FR,747,815,24.5)
boite("cap vide3",c,CX0,CY0,FC,770,837,22.4)

print("\n=== (b) CASSE par corps de lettre ===")
def casse(nom,px,ox,oy,f,x0,y0,x1,y1):
    X0,Y0,X1,Y1=PX(x0,ox,f),PX(y0,oy,f),PX(x1,ox,f),PX(y1,oy,f)
    vals=[]
    for y in range(Y0,Y1):
        for x in range(X0,X1): vals.append((lum(px[x,y]),x,y))
    vals.sort(); n=len(vals)
    fond=vals[int(n*0.15)][0]; encre=vals[int(n*0.995)][0]; s=fond+(encre-fond)*0.5
    grille=[[lum(px[x,y])>s for x in range(X0,X1)] for y in range(Y0,Y1)]
    # composantes connexes 8-voisins
    H=len(grille); W=len(grille[0]); vu=[[False]*W for _ in range(H)]
    blobs=[]
    for j in range(H):
        for i in range(W):
            if grille[j][i] and not vu[j][i]:
                pile=[(i,j)]; vu[j][i]=True; pts=[]
                while pile:
                    a,b=pile.pop(); pts.append((a,b))
                    for da in (-1,0,1):
                        for db in (-1,0,1):
                            u,v=a+da,b+db
                            if 0<=u<W and 0<=v<H and grille[v][u] and not vu[v][u]:
                                vu[v][u]=True; pile.append((u,v))
                blobs.append(pts)
    # baseline = max des y des blobs "corps" (les plus grands)
    blobs=[b for b in blobs if len(b)>=max(4,int(0.8*f*f))]
    if not blobs: print("  %-26s aucun blob"%nom); return
    bas=max(max(p[1] for p in b) for b in blobs)
    corps=[b for b in blobs if max(p[1] for p in b) >= bas-int(2*f)]   # touche la ligne de base
    hs=sorted(round((max(p[1] for p in b)-min(p[1] for p in b)+1)/f,2) for b in corps)
    verdict="CAPITALES" if (len(hs)>=2 and (max(hs)-min(hs))<=0.15*max(hs)) else "CASSE MIXTE"
    print("  %-26s %d corps, hauteurs %s -> %s"%(nom,len(corps),hs,verdict))

print("  -- controles positifs (uppercase par CSS) --")
casse("ref sous-titre",r,0,0,FR,110,74,255,95)
casse("cap sous-titre",c,CX0,CY0,FC,110,72,266,94)
casse("ref don.role (VOUS)",r,0,0,FR,131,196,182,216)
casse("cap don.role (LE DON)",c,CX0,CY0,FC,131,190,205,210)
print("  -- controles negatifs (casse mixte par contenu) --")
casse("ref vide1 txt",r,0,0,FR,197,392,437,418)
casse("cap vide1 txt",c,CX0,CY0,FC,185,388,450,414)
print("  -- SUJET : libelle ETAT --")
casse("ref rang1 ETAT",r,0,0,FR,483,304,520,324)
casse("cap rang1 ETAT",c,CX0,CY0,FC,481,301,522,321)
casse("ref rang2 ETAT",r,0,0,FR,483,506,520,526)
casse("cap rang2 ETAT",c,CX0,CY0,FC,481,502,522,522)
print("  -- SUJET : nom du rang du Don --")
casse("ref don.nom (Don V.)",r,0,0,FR,131,160,208,186)
casse("cap don.nom (Vous)",c,CX0,CY0,FC,129,159,190,185)
print("  -- SUJET : archetype (capture seule) --")
casse("cap rang1 archetype",c,CX0,CY0,FC,153,307,224,327)
print("  -- SUJET : texte de pastille --")
casse("ref rang1 pastille",r,0,0,FR,165,306,239,328)
casse("cap rang1 pastille",c,CX0,CY0,FC,253,305,319,327)
