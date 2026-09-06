# m32 — BALAYAGE DE CLASSE : pour CHAQUE bloc plein de la capture, (a) le pixel du coin est-il la
# couleur de remplissage (coin CARRÉ) ou le fond (coin ARRONDI) ? (b) existe-t-il un liseré, i.e.
# une couleur intermédiaire entre le fond et le remplissage sur 2 px ou plus au bord ?
# Contrôle positif : les blocs homologues de la RÉFÉRENCE doivent, eux, sortir « arrondi » et
#   « liseré présent » — sinon le test ne discrimine pas.
from util import *
print("== m32 balayage coins / liserés ==")
def diag(im, bbox, fill, fond, lbl):
    px=im.load(); x0,y0,x1,y1=bbox
    coins=[px[x0,y0],px[x1,y0],px[x0,y1],px[x1,y1]]
    def cls(c):
        df=abs(c[0]-fill[0])+abs(c[1]-fill[1])+abs(c[2]-fill[2])
        db=abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])
        return "REMPLI" if df<db else "fond"
    etat=[cls(c) for c in coins]
    # liseré : profil horizontal au milieu du côté gauche, 6 px avant le bord
    ym=(y0+y1)//2
    prof=[px[x,ym] for x in range(max(0,x0-6),x0+4)]
    inter=sum(1 for c in prof
              if abs(c[0]-fill[0])+abs(c[1]-fill[1])+abs(c[2]-fill[2])>24
              and abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>24)
    print(f"  {lbl:34s} coins={etat}  px 'ni fond ni remplissage' au bord gauche = {inter}")
cap=ouvrir(CAP); ref=ouvrir(REF)
FOND=(13,13,13)
diag(cap,(36,1359,381,1503),(255,90,77),FOND,"CAP pavé 1 (sélectionné)")
diag(cap,(418,1359,712,1494),(138,151,156),FOND,"CAP pavé 2")
diag(cap,(749,1359,1043,1494),(138,151,156),FOND,"CAP pavé 3")
diag(cap,(36,1628,199,1802),(255,90,77),FOND,"CAP carré 'parle'")
diag(cap,(200,1628,1043,1802),(22,22,28),FOND,"CAP panneau 'bulle'")
diag(cap,(36,1831,1043,1977),(255,90,77),FOND,"CAP CTA")
diag(cap,(36,2007,1043,2115),(22,22,28),FOND,"CAP filet archives")
print("  --- contrôles positifs sur la RÉFÉRENCE ---")
diag(ref,(107,804,309,1006),(30,42,64),(17,15,11),"RÉF médaillon 1 (r=18 CSS)")
diag(ref,(39,1431,254,1646),(30,42,64),(10,15,23),"RÉF médaillon .parle (r=18 CSS)")
diag(ref,(294,1190,1041,1646),(24,34,51),(10,15,23),"RÉF bulle (r=14/4 CSS)")
diag(ref,(39,1683,1040,1890),(147,64,44),(8,12,19),"RÉF tampon (r=11 CSS, bord 2 CSS)")
diag(ref,(39,1919,1041,2053),(10,15,23),(8,12,19),"RÉF filet (r=10 CSS, bord 1 CSS)")
