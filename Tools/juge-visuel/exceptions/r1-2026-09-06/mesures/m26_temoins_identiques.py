# m26 — TÉMOINS : trois chaînes IDENTIQUES présentes des deux côtés ("La ville",
# "Escalades archivées", "à relire à tête reposée"). Comparer la MÊME chaîne élimine la variable
# "contenu" : ce qui reste est la police (famille + corps + chasse).
# Contrôle positif : les deux images font 1080 px de large, donc 1 px CSS = 3,6 px des deux côtés
#   (dossier) ⇒ un rapport de 1,00 est attendu si les corps sont égaux.
from util import *
print("== m26 témoins de chaînes identiques ==")
def boite(im,fen,fond,seuil=25):
    px=im.load(); x0,y0,x1,y1=fen; mnx,mny,mxx,mxy,n=10**9,10**9,-1,-1,0
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>seuil:
                n+=1;mnx=min(mnx,x);mxx=max(mxx,x);mny=min(mny,y);mxy=max(mxy,y)
    return (mnx,mny,mxx,mxy,n)
ref=ouvrir(REF); cap=ouvrir(CAP)
cas=[
 ("« La ville »",              (ref,(400,1040,575,1082),(17,15,11),40), (cap,(770,1524,1020,1560),(13,13,13),25)),
 ("« Escalades archivées »",   (ref,( 60,1965,430,2010),(10,15,23),30), (cap,(340,2025,745,2062),(22,22,28),30)),
 ("« à relire à tête reposée »",(ref,(520,1970,850,2010),(10,15,23),30),(cap,(360,2066,720,2100),(22,22,28),30)),
]
for lbl,(ia,fa,ca,sa),(ib,fb,cb,sb) in cas:
    A=boite(ia,fa,ca,sa); B=boite(ib,fb,cb,sb)
    wa,ha=A[2]-A[0]+1,A[3]-A[1]+1; wb,hb=B[2]-B[0]+1,B[3]-B[1]+1
    print(f"  {lbl}")
    print(f"     RÉF  x{A[0]}..{A[2]} y{A[1]}..{A[3]}  {wa}x{ha} px  (n={A[4]})")
    print(f"     CAP  x{B[0]}..{B[2]} y{B[1]}..{B[3]}  {wb}x{hb} px  (n={B[4]})")
    print(f"     rapport CAP/RÉF : largeur {wb/wa:.3f} · hauteur {hb/ha:.3f} · densité d'encre "
          f"{(B[4]/(wb*hb))/(A[4]/(wa*ha)):.3f}")
