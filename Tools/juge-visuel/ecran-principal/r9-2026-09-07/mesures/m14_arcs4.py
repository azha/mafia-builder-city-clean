# m14 — arcs : fond soustrait PAR RAYON (mediane sur 360 angles), puis crete + largeur a mi-hauteur.
# Controle positif : sur le canon, l'epaisseur doit approcher la source stroke-width 3.5 vb x (44/60) = 2.567 CSS.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m14 arcs : fond soustrait par rayon ===')
def s_teal(c): return c[2]-c[0]
def s_brais(c): return c[0]-c[1]

CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94,587.45,130.85),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60),
     (F1920,'fiche1920',SC_CAPT,539.50,109.67,89.56,539.21,123.60)]
for path,nom,sc,mcx,mcy,mR,pvx,pvy in CFG:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    print('   --- %s (repere = PIVOT (%.2f,%.2f) CSS) ---' % (nom,pvx/sc,pvy/sc))
    Rmax=0.80*mR
    rs=[i*0.2 for i in range(int(4/0.2), int(Rmax/0.2))]
    def val(sig,x,y):
        xq,yq=int(x),int(y); fx,fy=x-xq,y-yq
        if not(0<=xq<W-1 and 0<=yq<H-1): return 0
        return (sig(px[xq,yq])*(1-fx)*(1-fy)+sig(px[xq+1,yq])*fx*(1-fy)
                +sig(px[xq,yq+1])*(1-fx)*fy+sig(px[xq+1,yq+1])*fx*fy)
    for lab,sig in (('teal',s_teal),('braise',s_brais)):
        base={}
        for r in rs:
            v=[val(sig, pvx+r*math.cos(math.radians(a)), pvy-r*math.sin(math.radians(a))) for a in range(0,360,2)]
            base[r]=med(v)
        # pour chaque angle : crete du signal soustrait
        crete={}
        for a in range(0,360):
            best=(-999,None)
            for r in rs:
                s=val(sig, pvx+r*math.cos(math.radians(a)), pvy-r*math.sin(math.radians(a)))-base[r]
                if s>best[0]: best=(s,r)
            crete[a]=best
        actifs=[a for a in range(0,360) if crete[a][0]>=28]
        if not actifs: print('      %-7s : aucun angle au-dessus du seuil' % lab); continue
        # segments contigus
        segs=[]; cur=[actifs[0]]
        for a in actifs[1:]:
            if a-cur[-1]<=3: cur.append(a)
            else: segs.append(cur); cur=[a]
        segs.append(cur)
        segs=[s for s in segs if len(s)>=8]
        for s in segs:
            rr=[crete[a][1] for a in s]
            eps=[]
            for a in s:
                pic=crete[a][0]
                prof=[(r, val(sig,pvx+r*math.cos(math.radians(a)),pvy-r*math.sin(math.radians(a)))-base[r]) for r in rs]
                good=[r for r,v in prof if v>=pic/2.0 and abs(r-crete[a][1])<0.25*mR]
                if good: eps.append(max(good)-min(good)+0.2)
            print('      %-7s : angles %+4d..%+4d (etendue %3d deg) ; R median %.2f CSS (%.2f..%.2f) ; crete %.0f ; EPAISSEUR mediane %.2f CSS (n=%d)'
                  % (lab, s[0], s[-1], s[-1]-s[0]+1, med(rr)/sc, min(rr)/sc, max(rr)/sc,
                     med([crete[a][0] for a in s]), med(eps)/sc, len(eps)))
    print()
