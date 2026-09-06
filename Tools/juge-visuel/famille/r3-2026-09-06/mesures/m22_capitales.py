# m22 — HAUTEUR DE CAPITALE par blob, sur des lettres a SOMMET PLAT (pas d'arrondi, pas d'accent) :
# on prend, dans chaque libelle, la MEDIANE des hauteurs de blobs touchant la ligne de base.
# Controle positif : le libelle ETAT et le texte de pastille ont la MEME taille CSS (14,93px) ->
# a la reference ils doivent rendre la meme hauteur. Controle negatif : le sous-titre (16,8px) est
# plus grand que l'un et l'autre.
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

def hauteurs(nom,px,ox,oy,f,x0,y0,x1,y1,taillecss=None):
    X0,Y0,X1,Y1=PX(x0,ox,f),PX(y0,oy,f),PX(x1,ox,f),PX(y1,oy,f)
    vals=[]
    for y in range(Y0,Y1):
        for x in range(X0,X1): vals.append((lum(px[x,y]),x,y))
    vals.sort(); n=len(vals)
    fond=vals[int(n*0.15)][0]; encre=vals[int(n*0.995)][0]; s=fond+(encre-fond)*0.5
    G=[[lum(px[x,y])>s for x in range(X0,X1)] for y in range(Y0,Y1)]
    H=len(G);W=len(G[0]);vu=[[False]*W for _ in range(H)];blobs=[]
    for j in range(H):
        for i in range(W):
            if G[j][i] and not vu[j][i]:
                st=[(i,j)];vu[j][i]=True;pts=[]
                while st:
                    a,b=st.pop();pts.append((a,b))
                    for da in(-1,0,1):
                        for db in(-1,0,1):
                            u,v=a+da,b+db
                            if 0<=u<W and 0<=v<H and G[v][u] and not vu[v][u]: vu[v][u]=True;st.append((u,v))
                blobs.append(pts)
    blobs=[b for b in blobs if len(b)>=max(5,int(1.2*f*f))]
    if not blobs: print("  %-30s rien"%nom); return
    bas=max(max(p[1] for p in b) for b in blobs)
    corps=[b for b in blobs if max(p[1] for p in b)>=bas-int(2*f)]
    hs=sorted((max(p[1] for p in b)-min(p[1] for p in b)+1)/f for b in corps)
    med=hs[len(hs)//2]
    extra="  ratio/taille=%.3f"%(med/taillecss) if taillecss else ""
    print("  %-30s n=%d  hauteurs %s  mediane %.2f%s"%(nom,len(hs),[round(h,2) for h in hs],med,extra))
    return med

print("\n== libelle ETAT (CSS 14,93px) ==")
for i,(ya,yb) in enumerate([(304,324),(506,526),(682,702)]):
    hauteurs("ref rang%d ETAT"%(i+1),r,0,0,FR,483,ya,521,yb,14.93)
for i,(ya,yb) in enumerate([(301,321),(502,522),(704,724)]):
    hauteurs("cap rang%d ETAT"%(i+1),c,CX0,CY0,FC,481,ya,522,yb,14.93)

print("\n== texte de PASTILLE (CSS 14,93px) ==")
hauteurs("ref rang1 DELEGUE",r,0,0,FR,165,306,239,328,14.93)
hauteurs("ref rang2 DIRECT",r,0,0,FR,165,508,235,530,14.93)
hauteurs("ref rang3 DELEGUE",r,0,0,FR,165,683,239,705,14.93)
hauteurs("cap rang1 RECENT",c,CX0,CY0,FC,253,305,319,327,14.93)
hauteurs("cap rang2 RECENT",c,CX0,CY0,FC,253,506,319,528,14.93)
hauteurs("cap rang3 RECENT",c,CX0,CY0,FC,253,708,319,730,14.93)

print("\n== valeur d'ETAT (CSS 21,47px, poids 600) ==")
hauteurs("ref rang1 Actif",r,0,0,FR,468,282,500,304,21.47)
hauteurs("cap rang1 Au repos",c,CX0,CY0,FC,415,279,455,301,21.47)
hauteurs("ref rang2 Repos",r,0,0,FR,455,484,495,506,21.47)
hauteurs("cap rang2 Au repos",c,CX0,CY0,FC,415,480,455,502,21.47)

print("\n== nom du rang (CSS 25,2px, serif) ==")
hauteurs("ref rang3 Blanchiment",r,0,0,FR,153,625,290,655,25.2)
hauteurs("cap rang3 Lt. Halde",c,CX0,CY0,FC,153,675,290,705,25.2)

print("\n== sous-titre (CSS 16,8px) : controle negatif ==")
hauteurs("ref sous-titre",r,0,0,FR,110,74,255,95,16.8)
hauteurs("cap sous-titre",c,CX0,CY0,FC,110,72,266,94,16.8)

print("\n== archetype capture (CSS de reference : .rang .role = 15,87px) ==")
hauteurs("cap rang1 Cuisinier",c,CX0,CY0,FC,153,307,224,327,15.87)
hauteurs("ref (aucun homologue)",r,0,0,FR,153,307,224,327,15.87)
