# m19 — suite de m18, bornes CORRIGEES : la zone comparee doit etre du DECOR dans LES DEUX
# images (le panneau de la REF commence a y=825 ; s*y+dy<820 => y_jeu < 749).
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
s,dx,dy=1.0910,-48,3
ir=Image.open(R).convert('RGB'); ij=Image.open(J).convert('RGB')
print("REF",ir.size,"JEU1920",ij.size,"  homographie REF = %.4f*JEU + (%d,%d)"%(s,dx,dy))
pxr=ir.load(); pxj=ij.load()
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
A=[];Bv=[];Ar=[[],[],[]];Br=[[],[],[]]
for y in range(170,746,2):
    for x in range(60,1020,3):
        X=int(s*x+dx); Y=int(s*y+dy)
        if 0<=X<ir.width and 0<=Y<ir.height:
            a=pxr[X,Y]; b=pxj[x,y]
            A.append(lum(a)); Bv.append(lum(b))
            for i in range(3): Ar[i].append(a[i]); Br[i].append(b[i])
n=len(A)
print(f"  n={n} points apparies, zone JEU y 170..745 (= REF y 188..816) — DECOR des deux cotes")
print(f"  luminance moyenne : REF {sum(A)/n:.2f}   JEU {sum(Bv)/n:.2f}   rapport {sum(Bv)/sum(A):.3f}")
print(f"  RGB moyen         : REF ({sum(Ar[0])//n},{sum(Ar[1])//n},{sum(Ar[2])//n})   JEU ({sum(Br[0])//n},{sum(Br[1])//n},{sum(Br[2])//n})")
As=sorted(A); Bs=sorted(Bv)
print("   %-6s %8s %8s %8s" % ("perc","REF","JEU","JEU/REF"))
for q in (1,5,10,25,50,75,90,95,99):
    a=As[min(n-1,int(n*q/100))]; b=Bs[min(n-1,int(n*q/100))]
    print("   p%-5d %8.2f %8.2f %8.3f" % (q,a,b,(b/a if a else 0)))
for seuil in (6,8,10,12,16):
    fa=100*sum(1 for v in A if v<seuil)/n; fb=100*sum(1 for v in Bv if v<seuil)/n
    print(f"   part des pixels sous lum {seuil:2d} : REF {fa:5.1f} %   JEU {fb:5.1f} %")
# ecart-type (contraste local global)
ma=sum(A)/n; mb=sum(Bv)/n
sa=(sum((v-ma)**2 for v in A)/n)**0.5; sb=(sum((v-mb)**2 for v in Bv)/n)**0.5
print(f"  ecart-type (etendue tonale) : REF {sa:.2f}   JEU {sb:.2f}   rapport {sb/sa:.3f}")
