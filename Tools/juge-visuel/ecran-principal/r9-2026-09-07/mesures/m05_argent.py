# m05 — aile gauche : ARGENT, montant, barre de ratio ; jour au cerclage du medaillon
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m05 aile gauche : montant, capitale, jour au medaillon, barre de ratio ===')

def encre(px, box, pred):
    x0,y0,x1,y1=box; pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(px[x,y]): pts.append((x,y))
    return pts

def bbox(pts):
    if not pts: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return (min(xs),min(ys),max(xs),max(ys))

def orvif(c):  # or-vif (242,201,107) tolerant : jaune sature clair
    r,g,b=c
    return r>150 and g>110 and b<160 and r-b>55 and r>=g

for path,nom,sc,cx_ring,R_ring in [(CANON,'canon',SC_CANON,587.49,93.94),
                                   (DIST,'district2400',SC_CAPT,539.50,89.56),
                                   (F1920,'fiche1920',SC_CAPT,539.50,89.56),
                                   (F2400,'fiche2400',SC_CAPT,539.50,89.56)]:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    band=(0,0,int(cx_ring), int(52*sc))
    pts=encre(px, band, orvif)
    bb=bbox(pts)
    print('   [%s] encre or-vif dans l\'aile gauche (x<%d, y<%d) : %d px, bbox px %s' % (nom,int(cx_ring),int(52*sc),len(pts),bb))
    if bb:
        print('        bbox CSS x %.2f..%.2f  y %.2f..%.2f' % (bb[0]/sc,bb[2]/sc,bb[1]/sc,bb[3]/sc))
    # colonne la plus a droite de l'encre or-vif
    if pts:
        xmax=max(p[0] for p in pts)
        # bord NOMINAL interieur du cerclage (pic - demi epaisseur nominale)
        if nom=='canon': r_int = 93.94 - 1.5*sc/2
        else:           r_int = 89.56 - 1.5*sc/2
        # a la hauteur du montant : y du centre de l'encre
        ymid = (bb[1]+bb[3])/2.0
        cy_ring = 116.52 if nom=='canon' else 109.67
        dy = ymid-cy_ring
        if abs(dy) < r_int:
            xg = cx_ring - math.sqrt(r_int**2 - dy**2)
            print('        dernier px or-vif x=%d (%.2f CSS) ; bord NOMINAL du cerclage a cette hauteur x=%.1f (%.2f CSS) ; JOUR = %.2f CSS'
                  % (xmax, xmax/sc, xg, xg/sc, (xg-xmax)/sc))
        # jour VISIBLE : premiere colonne, en partant de xmax, ou l'exces de rougeur apparait
    print()
