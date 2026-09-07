# m07 — montant : hauteur de capitale, extremite droite, jour au cerclage, recouvrement
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m07 montant : capitale, extremite droite, jour au medaillon ===')
def orvif(c):
    r,g,b=c; return r>140 and g>100 and b<170 and r-b>50 and r>=g-6

CFG=[(CANON,'canon',SC_CANON,(30,700),(60,106),587.49,116.52,93.94,1.5),
     (DIST,'district2400',SC_CAPT,(30,660),(68,104),539.50,109.67,89.56,1.5),
     (F1920,'fiche1920',SC_CAPT,(30,660),(68,104),539.50,109.67,89.56,1.5)]

for path,nom,sc,(x0,x1),(y0,y1),cx,cyr,Rr,ep in CFG:
    im=ouvrir(path,nom); px=im.load()
    cols={}
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if orvif(px[x,y])]
        if ys: cols[x]=(min(ys),max(ys),len(ys))
    if not cols: print('   rien'); continue
    xs=sorted(cols)
    # exclure le cerclage du medaillon : coupe a cx - Rr - 2px
    xcut = cx - Rr - 2
    xs_txt=[x for x in xs if x < xcut]
    print('   [%s] colonnes d\'encre or-vif : %d, de x=%d a x=%d ; coupure medaillon a x=%.1f' % (nom,len(xs),xs[0],xs[-1],xcut))
    # hauteur de capitale : mediane des hauteurs de colonnes "pleines" (>=60% du max)
    hmax=max(c[1]-c[0]+1 for x,c in cols.items() if x<xcut)
    hs=[cols[x][1]-cols[x][0]+1 for x in xs_txt]
    tops=[cols[x][0] for x in xs_txt]; bots=[cols[x][1] for x in xs_txt]
    print('        texte (hors medaillon) x %.2f..%.2f CSS ; haut med %.2f CSS ; bas med %.2f CSS ; hauteur d\'encre mediane %.2f CSS ; max %.2f CSS'
          % (xs_txt[0]/sc, xs_txt[-1]/sc, med(tops)/sc, med(bots)/sc, med(hs)/sc, hmax/sc))
    xmax=xs_txt[-1]
    ymid=(med(tops)+med(bots))/2.0
    r_int = Rr - ep*sc/2.0     # bord interieur NOMINAL du cerclage
    r_ext = Rr + ep*sc/2.0
    for lab,r in (('interieur',r_int),('mediane',Rr),('exterieur',r_ext)):
        dy=ymid-cyr
        if abs(dy)<r:
            xg=cx-math.sqrt(r*r-dy*dy)
            print('        bord %-10s du cerclage a la hauteur du montant : x=%.1f px (%.2f CSS) -> jour = %+.2f CSS'
                  % (lab, xg, xg/sc, (xg-xmax)/sc))
    # y a-t-il de l'encre or-vif du texte DANS le disque du medaillon ?
    dedans=[x for x in xs if x>=xcut]
    if dedans:
        print('        !! encre or-vif a droite de la coupure : x %d..%d (probablement le cerclage/pivot)' % (min(dedans),max(dedans)))
    print()
