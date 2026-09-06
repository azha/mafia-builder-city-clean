import sys; sys.path.insert(0,'.')
from lib import *
print("=== m21 : torse (dome) et montre/gant ===")
CAS=[('REF','../reference-1080x2102.png',(85,880),(11,16,22),(17,24,35),1240,1540),
     ('JEU','../capture-1080x2400.png',  (81,908),(13,14,23),(13,22,34),1260,1560)]
for nom,f,(ox,oy),torse,fondc,y0,y1 in CAS:
    im=ouvrir(f); p=px(im)
    def est_torse(c): return all(abs(c[i]-torse[i])<=7 for i in range(3))
    bb=bbox_masque(im, est_torse, ox, y0, ox+418, y1)
    print(f"  {nom} TORSE : x{bb[0]}..{bb[2]} ({bb[2]-bb[0]+1}) y{bb[1]}..{bb[3]} ({bb[3]-bb[1]+1}) n={bb[4]}"
          f" centre x rel carte = {(bb[0]+bb[2])/2-ox:.1f}")
    # largeur du torse par ligne
    ws=[]
    for y in range(bb[1],bb[3]+1,10):
        xs=[x for x in range(ox,ox+418) if est_torse(p[x,y])]
        ws.append(f"{y-oy}:{(max(xs)-min(xs)+1) if xs else 0}")
    print(f"     largeur par ligne (y rel carte) : {' '.join(ws)}")
    # MONTRE : pixels plus clairs que le torse, DANS le torse
    def clair(c):
        return est_torse(c)==False and 30<lum(c)<160 and abs(c[0]-c[2])<40
    # restreindre a la moitie gauche basse du torse
    bm=bbox_masque(im, clair, bb[0]+5, bb[1]+40, bb[0]+140, bb[3]-5)
    if bm:
        print(f"     MONTRE : x{bm[0]}..{bm[2]} ({bm[2]-bm[0]+1}) y{bm[1]}..{bm[3]} ({bm[3]-bm[1]+1}) n={bm[4]}"
              f" centre rel carte = ({(bm[0]+bm[2])/2-ox:.1f},{(bm[1]+bm[3])/2-oy:.1f})")
        print(f"        distance du centre de la montre a l'axe du buste (x rel carte 208.5/209.5) = {(bm[0]+bm[2])/2-ox-208.5:.1f} px")
