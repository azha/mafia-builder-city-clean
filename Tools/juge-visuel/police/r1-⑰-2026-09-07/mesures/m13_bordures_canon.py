# -*- coding: utf-8 -*-
"""m13 — bordures du canon série 2 détectées par CONTRASTE LOCAL (le fond n'est pas noir pur).
Contrôle positif : le même détecteur, sur la capture, doit retrouver les rails déjà mesurés (348, 622, 895, 1039)."""
import commun as C

print('== m13 : bordures par contraste local ==')
can = C.ouvrir('canon2'); cap = C.ouvrir('capture')

def rails(im, nom, x0, x1, y0, y1, marge=6.0):
    p=im.load()
    moy=[]
    for y in range(y0,y1):
        s=0
        for x in range(x0,x1,2):
            q=p[x,y]; s+=(q[0]*299+q[1]*587+q[2]*114)//1000
        moy.append(s/((x1-x0)//2))
    trouves=[]
    for i in range(6, len(moy)-6):
        voisin = (sum(moy[i-6:i-2])+sum(moy[i+3:i+7]))/8.0
        if moy[i] - voisin > marge and moy[i] >= max(moy[i-2:i+3]):
            trouves.append((y0+i, round(moy[i],1), round(voisin,1)))
    print('   %-28s %d rail(s) : %s' % (nom, len(trouves), trouves[:10]))
    return trouves

print('\n-- CONTRÔLE POSITIF : capture (rails connus 348, 622, 895, 1039) --')
rails(cap, 'capture x=200..900', 200, 900, 330, 1160)

print('\n-- CANON serie 2 --')
r = rails(can, 'canon x=200..700', 200, 700, 260, 900, 4.0)

print('\n-- couleur des rails du canon --')
p=can.load()
for y,_,_ in r[:8]:
    pts=[p[x,y] for x in range(250,650,3)]
    med=tuple(sorted(c[i] for c in pts)[len(pts)//2] for i in range(3))
    print('     y=%4d  couleur mediane %s  (R-B = %+d)' % (y, C.hx(med), med[0]-med[2]))

print('\n-- couleur des rails de la capture (rappel) --')
p2=cap.load()
for y in (348, 622, 895, 1039):
    pts=[p2[x,y] for x in range(200,600,3)]
    med=tuple(sorted(c[i] for c in pts)[len(pts)//2] for i in range(3))
    print('     y=%4d  couleur mediane %s  (R-B = %+d)' % (y, C.hx(med), med[0]-med[2]))

print('\n-- marges laterales du canon, mesurees sur un rail --')
if r:
    y = r[0][0]
    fond = C.mediane_fenetre(can, 450, y-14, 4)
    lf = (fond[0]*299+fond[1]*587+fond[2]*114)//1000
    xs=[x for x in range(900) if ((lambda q:(q[0]*299+q[1]*587+q[2]*114)//1000)(p[x,y])) > lf+4]
    if xs:
        print('     rail y=%d : x=%d..%d  largeur %d = %.2f %% de 900  (marge gauche %.2f %%)'
              % (y, min(xs), max(xs), max(xs)-min(xs)+1, 100.0*(max(xs)-min(xs)+1)/900, 100.0*min(xs)/900))
