# m06 — bbox du tampon de la RÉFÉRENCE par PLAGES CONTIGUËS (une plaque = une longue course de crème
# sur une même ligne ; une silhouette de buste ne fait jamais 900 px de large).
from util import *
print("== m06 tampon (référence) par course horizontale ==")
ref=ouvrir(REF); px=ref.load()
def course_max(y, cible=(217,204,169), tol=26):
    best=0; cur=0; x0b=None; x0=None
    for x in range(1080):
        c=px[x,y]
        if abs(c[0]-cible[0])<=tol and abs(c[1]-cible[1])<=tol and abs(c[2]-cible[2])<=tol:
            if cur==0: x0=x
            cur+=1
            if cur>best: best=cur; x0b=x0
        else: cur=0
    return best, x0b
lignes=[]
for y in range(1400,2102):
    b,x0=course_max(y)
    if b>500: lignes.append((y,b,x0))
print(f"  {len(lignes)} lignes avec une course crème > 500 px")
print(f"  première={lignes[0]}  dernière={lignes[-1]}")
y0,y1=lignes[0][0],lignes[-1][0]
# le bord #93402c (147,64,44) entoure la plaque : bbox du bord
def bbox_c(cible,tol,fen):
    x0,ya,x1,yb=fen; mnx,mny,mxx,mxy,n=10**9,10**9,-1,-1,0
    for y in range(ya,yb):
        for x in range(x0,x1):
            c=px[x,y]
            if abs(c[0]-cible[0])<=tol and abs(c[1]-cible[1])<=tol and abs(c[2]-cible[2])<=tol:
                n+=1;mnx=min(mnx,x);mxx=max(mxx,x);mny=min(mny,y);mxy=max(mxy,y)
    return (mnx,mny,mxx,mxy,n)
bb=bbox_c((147,64,44),18,(0,y0-30,1080,y1+30))
print(f"  bord #93402c bbox={bb[:4]} n={bb[4]} -> {bb[2]-bb[0]+1}x{bb[3]-bb[1]+1} px")
print(f"  plaque crème (courses>500) : y {y0}..{y1}  h={y1-y0+1}, x0={min(l[2] for l in lignes)}, largeur max={max(l[1] for l in lignes)}")
# épaisseur du bord : profil vertical au centre x=540, en haut de la plaque
cx=540
print("  profil VERTICAL x=540 autour du bord haut :")
print("   ", [(y,px[cx,y]) for y in range(bb[1]-6,bb[1]+22,2)])
print("  profil VERTICAL x=540 autour du bord bas :")
print("   ", [(y,px[cx,y]) for y in range(bb[3]-20,bb[3]+8,2)])
