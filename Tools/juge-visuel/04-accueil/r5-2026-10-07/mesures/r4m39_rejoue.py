# m39 — « trop sombre » : de quelle NATURE, et quelle correction ?
# Appariement REF<->JEU valide au m18 (r=0,973 ; controle negatif -0,060 ; regression du JEU sur
# lui-meme a=1,000 b=0,000). On ajuste REF = a*JEU + b PAR BANDE, puis on SIMULE deux correctifs
# sur le JEU et on mesure lequel approche le mieux la REFERENCE :
#   (A) GAIN      : teinte 0,42 -> 0,46, soit x1,095 sur tout le decor
#   (B) PLANCHER  : +5/255 additif sur les trois canaux (le terme constant du voile)
#   (C) les deux
# Controle positif : le correctif NUL (identite) doit rendre l'ecart deja mesure au m19.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r4b/p1_lancement_1080x1920.png"
s,dx,dy=1.0910,-48,3
ir=Image.open(R).convert('RGB'); ij=Image.open(J).convert('RGB')
print("LU REF %s | JEU %s | homographie REF = %.4f*JEU + (%d,%d)"%(ir.size,ij.size,s,dx,dy))
pxr=ir.load(); pxj=ij.load()
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
PAIRES=[]
for y in range(170,746):
    for x in range(60,1020,2):
        X=int(s*x+dx); Y=int(s*y+dy)
        if 0<=X<ir.width and 0<=Y<ir.height:
            PAIRES.append((y,pxj[x,y],pxr[X,Y]))
print("  %d paires appariees (zone de decor commune)"%len(PAIRES))
def fit(P,ca):
    X=[p[1][ca] for p in P]; Y=[p[2][ca] for p in P]; n=len(X)
    sx=sum(X); sy=sum(Y); sxx=sum(v*v for v in X); sxy=sum(X[i]*Y[i] for i in range(n))
    a=(n*sxy-sx*sy)/(n*sxx-sx*sx); b=(sy-a*sx)/n
    return a,b
print("\n=== REF = a x JEU + b, PAR BANDE (si b>0 : la reference a un PLANCHER que le jeu n'a pas) ===")
NB=6
for i in range(NB):
    y0=int(170+(746-170)*i/NB); y1=int(170+(746-170)*(i+1)/NB)
    P=[p for p in PAIRES if y0<=p[0]<y1]
    out=[]
    for ca,nc in ((0,'R'),(1,'G'),(2,'B')):
        a,b=fit(P,ca); out.append(f"{nc} a={a:.3f} b={b:+5.2f}")
    mj=sum(lum(p[1]) for p in P)/len(P); mr=sum(lum(p[2]) for p in P)/len(P)
    print(f"  bande JEU y {y0:4d}..{y1:4d} (n={len(P):6d}) : " + "  ".join(out) + f"   | lum REF {mr:5.2f} JEU {mj:5.2f} rapport {mj/mr:.3f}")
print("\n=== SIMULATION DE CORRECTIFS : ecart absolu moyen au reference, par canal et en luminance ===")
def ecart(f,nom):
    e=[0.0,0.0,0.0]; el=0.0; nb=0; sous10=0
    for _,j,r in PAIRES:
        c=f(j)
        for k in range(3): e[k]+=abs(c[k]-r[k])
        el+=abs(lum(c)-lum(r)); nb+=1
        if lum(c)<10: sous10+=1
    print(f"  {nom:52s} |dR|={e[0]/nb:5.2f} |dG|={e[1]/nb:5.2f} |dB|={e[2]/nb:5.2f}  |dLum|={el/nb:5.2f}   pixels sous lum 10 : {100*sous10/nb:4.1f} %")
def cl(v): return max(0,min(255,int(round(v))))
ecart(lambda p:p, "(controle positif) JEU tel quel")
ecart(lambda p:tuple(cl(v*1.095) for v in p), "(A) GAIN x1,095  (teinte 0,42 -> 0,46)")
ecart(lambda p:tuple(cl(v*1.230) for v in p), "(A') GAIN x1,230 (cale sur la luminance moyenne)")
ecart(lambda p:tuple(cl(v+5) for v in p),     "(B) PLANCHER +5/255")
ecart(lambda p:tuple(cl(v+7) for v in p),     "(B') PLANCHER +7/255")
ecart(lambda p:tuple(cl(v*1.05+5) for v in p),"(C) GAIN x1,05 + PLANCHER +5/255")
ecart(lambda p:(cl(p[0]*0.749+8.52),cl(p[1]*0.812+8.51),cl(p[2]*0.949+5.73)), "(D) l'ajustement affine global du m20 (borne basse de l'erreur)")
# le reference lui-meme : part de pixels sous lum 10
n=len(PAIRES); print(f"  {'REFERENCE (cible)':52s} {'':38s} pixels sous lum 10 : {100*sum(1 for _,_,r in PAIRES if lum(r)<10)/n:4.1f} %")
