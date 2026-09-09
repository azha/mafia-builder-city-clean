# m20 — etendue angulaire des arcs autour du PIVOT, par composante connexe (elimine filet et accents).
# Controle positif : canon teal doit rendre 90 deg (source : 180 -> 90) et braise 60,5 deg (60,5 -> 0).
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m20 etendue angulaire des arcs (composante connexe) ===')
def teal(c): return c[2]-c[0]>25 and c[1]-c[0]>15
def brais(c): return c[0]-c[1]>28 and c[0]-c[2]>28
CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94,587.45,130.85),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60),
     (F1920,'fiche1920',SC_CAPT,539.50,109.67,89.56,539.21,123.60)]
out={}
for path,nom,sc,mcx,mcy,mR,pvx,pvy in CFG:
    im=ouvrir(path,nom); px=im.load(); lim=0.82*mR
    print('   --- %s ---'%nom)
    for lab,pred in (('teal',teal),('braise',brais)):
        S=set()
        for y in range(int(mcy-lim),int(mcy+lim)):
            for x in range(int(mcx-lim),int(mcx+lim)):
                if math.hypot(x-mcx,y-mcy)<lim and y<=pvy+2 and pred(px[x,y]): S.add((x,y))
        comps=[]; vus=set()
        for p in S:
            if p in vus: continue
            pile=[p]; vus.add(p); c=[]
            while pile:
                q=pile.pop(); c.append(q)
                for d in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                    n=(q[0]+d[0],q[1]+d[1])
                    if n in S and n not in vus: vus.add(n); pile.append(n)
            comps.append(c)
        comps.sort(key=len, reverse=True)
        c=comps[0]
        A=[math.degrees(math.atan2(-(p[1]-pvy),p[0]-pvx)) for p in c]
        ref=med(A); A=sorted(((a-ref+180)%360)-180+ref for a in A)
        Rs=sorted(math.hypot(p[0]-pvx,p[1]-pvy) for p in c)
        a0,a1=A[2],A[-3]
        L=med(Rs)*math.radians(a1-a0)
        print('      %-7s : composantes %s ; plus grosse %d px ; angles %+.1f..%+.1f (etendue %.1f deg) ; R median/pivot %.2f CSS ; epaisseur=aire/longueur %.2f CSS'
              % (lab,[len(x) for x in comps[:4]],len(c),a0,a1,a1-a0,med(Rs)/sc,len(c)/L/sc))
        out[(nom,lab)]=(a0,a1)
    if (nom,'teal') in out and (nom,'braise') in out:
        print('      VIDE : braise finit a %+.1f, teal commence a %+.1f -> %.1f deg'
              % (out[(nom,'braise')][1], out[(nom,'teal')][0], out[(nom,'teal')][0]-out[(nom,'braise')][1]))
