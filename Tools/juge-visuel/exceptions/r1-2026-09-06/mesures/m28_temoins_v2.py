# m28 — témoins de chaînes identiques, v2 : fenêtres purgées du halo du rail (piège du tour
# précédent — la boîte « La ville » côté RÉF ramassait la lueur du rail braise, d'où +10 px faux).
from util import *
print("== m28 témoins (v2) ==")
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
 ("« La ville »",               (ref,(420,1045,570,1080),(17,15,11),40),(cap,(770,1524,1020,1560),(13,13,13),25)),
 ("« Escalades archivées »",    (ref,( 60,1965,430,2010),(10,15,23),30),(cap,(340,2025,745,2062),(22,22,28),30)),
 ("« à relire à tête reposée »",(ref,(520,1970,850,2010),(10,15,23),30),(cap,(360,2066,720,2100),(22,22,28),30)),
]
for lbl,(ia,fa,ca,sa),(ib,fb,cb,sb) in cas:
    A=boite(ia,fa,ca,sa); B=boite(ib,fb,cb,sb)
    wa,ha=A[2]-A[0]+1,A[3]-A[1]+1; wb,hb=B[2]-B[0]+1,B[3]-B[1]+1
    print(f"  {lbl}\n     RÉF {wa}x{ha} px (x{A[0]}..{A[2]} y{A[1]}..{A[3]})   CAP {wb}x{hb} px (x{B[0]}..{B[2]} y{B[1]}..{B[3]})"
          f"\n     rapport CAP/RÉF : largeur {wb/wa:.3f} · hauteur {hb/ha:.3f}")
# noms des 3 colonnes, réf : y de chaque
for lbl,fen in (("Lt. Kane",(120,1040,290,1085)),("La ville",(400,1045,570,1080)),("Lt. Marr",(630,995,850,1035))):
    A=boite(ref,fen,(17,15,11),40)
    print(f"  RÉF nom « {lbl} » : x{A[0]}..{A[2]} y{A[1]}..{A[3]} {A[2]-A[0]+1}x{A[3]-A[1]+1}")
