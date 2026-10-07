# m23 — plaque TRANCHER v2 : son liseré a sa PROPRE couleur ((41,53,71) ref / (42,53,71) jeu),
# differente de celle du panneau — le detecteur du panneau (m20) ne pouvait pas la voir.
# Controle positif : la largeur de la plaque doit egaler celle du panneau (988 / 986 px, m5).
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
B={'REF':(41,53,71),'JEU1920':(42,53,71),'JEU2400':(42,53,71)}
XG={'REF':47,'JEU1920':48,'JEU2400':48}; XD={'REF':1032,'JEU1920':1031,'JEU2400':1031}
def pr(p,b,tol=8): return max(abs(p[i]-b[i]) for i in range(3))<=tol
def plaque(im,nom):
    px=im.load(); w,h=im.size; b=B[nom]
    ok=[y for y in range(h) if pr(px[XG[nom],y],b) and pr(px[XD[nom],y],b)]
    grp=[];cur=[ok[0]]
    for y in ok[1:]:
        if y-cur[-1]<=3: cur.append(y)
        else: grp.append(cur); cur=[y]
    grp.append(cur)
    print(f'  --- {nom} ---')
    for g in grp:
        if len(g)>=15: print(f'    plaque (cotes droits) y {g[0]}..{g[-1]} hauteur droite={g[-1]-g[0]+1}')
    # bords haut/bas (liseré horizontal) : au centre x=540
    hs=[y for y in range(h) if pr(px[540,y],b,10)]
    print(f'    liseré horizontal au centre x=540 : y {hs}')
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: plaque(charge(p),n)
