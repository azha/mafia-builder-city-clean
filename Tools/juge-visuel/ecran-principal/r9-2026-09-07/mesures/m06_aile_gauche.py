# m06 — aile gauche detaillee : lignes d'encre, montant, jour au medaillon, barre de ratio + piste
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m06 aile gauche : lignes, montant, jour, ratio ===')

def orvif(c):
    r,g,b=c; return r>140 and g>100 and b<170 and r-b>50 and r>=g-6

def lignes(px, x0,x1, y0,y1, pred):
    rows=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if pred(px[x,y]))
        rows.append((y,n))
    # regroupe les bandes non nulles
    seq=[]; cur=None
    for y,n in rows:
        if n>0:
            if cur is None: cur=[y,y,n]
            else: cur[1]=y; cur[2]=max(cur[2],n)
        else:
            if cur: seq.append(tuple(cur)); cur=None
    if cur: seq.append(tuple(cur))
    return seq

for path,nom,sc,xlim,cx,cyr,Rr in [(CANON,'canon',SC_CANON,480,587.49,116.52,93.94),
                                   (DIST,'district2400',SC_CAPT,440,539.50,109.67,89.56)]:
    im=ouvrir(path,nom); px=im.load()
    print('   [%s] bandes d\'encre or-vif dans x 30..%d, y 0..%d :' % (nom,xlim,int(52*sc)))
    for a,b,n in lignes(px, 30, xlim, 0, int(52*sc), orvif):
        if b-a>=2:
            print('      y %3d..%3d px = %6.2f..%6.2f CSS  h=%5.2f CSS  max %d px/ligne' % (a,b,a/sc,b/sc,(b-a+1)/sc,n))
    print()
