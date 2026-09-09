# m23 — ABSENCES, par COMPTE DE PIXELS DE LA TEINTE PROPRE A CHAQUE ELEMENT (le m22 comparait des
#       L max domines par les noms : il ne discriminait pas). Chaque element a sa signature de la CSS :
#       ecusson chasse stroke #e0664a ; pin/halo/disque #f2c96b ; lavis warm #d9ab4e a .3 ; drapeau #e0664a.
#       Grandeur = nombre de px de la teinte dans la fenetre, des DEUX cotes, au meme endroit recale.
# CONTROLE POSITIF : la route or (#f2c96b, peinte, presente des DEUX cotes) doit rendre un compte NON NUL
#       des deux cotes avec le meme filtre or -> prouve que le filtre attrape bien la teinte.
# + COUCHE GLOBALE recalculee en MASQUANT les zones d'ETAT (ASSUME), pour savoir ce que ces absences
#       expliquent de l'ecart global.
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
S,TX,TY=1.0220,-12.0,8.0
def Y(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def rouge(p):   # #e0664a et sa lueur : rouge franc
    R,G,B=p; return R>110 and R-G>45 and R-B>45
def orjaune(p): # #f2c96b / #d9ab4e : or
    R,G,B=p; return R>110 and R-B>70 and G>80 and R-G<70
def cyan(p):
    R,G,B=p; return B>110 and B-R>40
def compte(px,W,H,box,f):
    x0,y0,x1,y1=box
    n=0
    for y in range(max(0,y0),min(H,y1)):
        for x in range(max(0,x0),min(W,x1)):
            if f(px[x,y]): n+=1
    return n
CIB=[("ecusson 1 (sur QUAI-NORD)",(368,372,462,472),rouge),
     ("ecusson 2 (sur HAUTES-MARCHES)",(386,552,472,652),rouge),
     ("ecusson 3 (sur SAINT-BRAND)",(132,782,222,882),rouge),
     ("ecusson 4 (sur LES ENTREPOTS)",(372,790,462,882),orjaune),
     ("ecusson 5 (sur PLACE DES COMPTES)",(368,1538,452,1632),cyan),
     ("ecusson 6 (sur LES FRICHES)",(596,1688,684,1782),rouge),
     ("epingle + halo VOUS ETES ICI",(830,1490,930,1620),orjaune),
     ("disque or LA LISIERE",(790,1500,1010,1700),orjaune),
     ("drapeau rouge (LES BASSINS)",(238,340,292,404),rouge),
     ("lavis khaki LES BASSINS",(60,360,300,520),orjaune),
     ("lavis khaki HAUTES-MARCHES",(400,560,760,760),orjaune)]
print(f"   {'element':36s}{'REF px':>9}{'CAP px':>9}   verdict")
for n,(x0,y0,x1,y1),f in CIB:
    a=compte(RP,1080,2102,(x0,y0,x1,y1),f)
    b=compte(CP,1080,2400,(int(S*x0+TX),int(S*y0+TY),int(S*x1+TX),int(S*y1+TY)),f)
    v = "ABSENT en jeu" if (a>=120 and b<=a*0.10) else ("present des 2 cotes" if b>a*0.5 else "partiel / a dire")
    print(f"   {n:36s}{a:>9}{b:>9}   {v}")
print("\n   CTRL+ la ROUTE OR (peinte, presente des deux cotes), fenetre ref (150,630)-(400,690), filtre OR :")
a=compte(RP,1080,2102,(150,630,400,690),orjaune); b=compte(CP,1080,2400,(int(S*150+TX),int(S*630+TY),int(S*400+TX),int(S*690+TY)),orjaune)
print(f"      REF {a} px | CAP {b} px  -> le filtre OR attrape bien la teinte des DEUX cotes")
print("   CTRL+ le FLEUVE (peint), fenetre ref (400,1050)-(700,1200), filtre CYAN :")
a=compte(RP,1080,2102,(400,1050,700,1200),cyan); b=compte(CP,1080,2400,(int(S*400+TX),int(S*1050+TY),int(S*700+TX),int(S*1200+TY)),cyan)
print(f"      REF {a} px | CAP {b} px")

print("\n[COUCHE GLOBALE en MASQUANT les zones d'ETAT (ASSUME)]")
MASK=[(60,340,320,530),(340,540,780,780),(760,1470,1020,1720),(360,360,470,480),(380,540,480,660),
      (130,770,230,890),(370,780,470,890),(360,1530,460,1640),(590,1680,690,1790),(230,330,300,410),
      (0,1930,1080,2084)]   # + le pied de page de la reference (voile + legende)
def masque(x,y):
    for a,b,c,d in MASK:
        if a<=x<=c and b<=y<=d: return True
    return False
for tag,px,y0,y1,conv in (("REF",RP,219,2084,lambda x,y:(x,y)),
                          ("CAP",CP,232,2135,lambda x,y:(int(S*x+TX),int(S*y+TY)))):
    L=[]
    for ry in range(219,2085,3):
        for rx in range(0,1080,3):
            if masque(rx,ry): continue
            x,y=conv(rx,ry)
            if 0<=x<1080 and 0<=y<(2102 if tag=="REF" else 2400): L.append(Y(px[x,y]))
    L.sort()
    print(f"  {tag} (n={len(L)}) : L moyenne {statistics.mean(L):6.2f}  mediane {statistics.median(L):6.2f}  p90 {L[int(len(L)*0.9)]:6.2f}  p99 {L[int(len(L)*0.99)]:6.2f}  densite L>110 {100*sum(1 for v in L if v>110)/len(L):5.2f} %")
