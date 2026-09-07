# m32 — marqueurs de batiment : composantes AMBRE annulaires, puis verification du gabarit au centroide.
# Calibre sur le marqueur "Laboratoire" (491,784) de la planche 2400.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m32 marqueurs de batiment ===')
def ambre(c):
    r,g,b=c; return r>140 and g>105 and b<130 and r-b>70 and g-b>40
def anneau(px,W,H,x,y):
    best=0
    for r in (5.7,6.3,6.9):
        n=0
        for k in range(32):
            xi=int(round(x+r*math.cos(2*math.pi*k/32))); yi=int(round(y+r*math.sin(2*math.pi*k/32)))
            if not(0<=xi<W and 0<=yi<H): return -1
            if ambre(px[xi,yi]): n+=1
        best=max(best,n/32.0)
    return best
def medlum(px,W,H,x,y,rs,na=24):
    v=[]
    for r in rs:
        for k in range(na):
            xi=int(round(x+r*math.cos(2*math.pi*k/na))); yi=int(round(y+r*math.sin(2*math.pi*k/na)))
            if 0<=xi<W and 0<=yi<H: v.append(lum(px[xi,yi]))
    return med(v) if v else 1.0
RES={}
for path,nom,Y0,Y1,ref in [(DIST,'district2400',240,2160,(491,784)),
                           (F1920,'fiche1920',0,1920,(491,544)),
                           (F2400,'fiche2400',240,2160,(491,784))]:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    S=set((x,y) for y in range(Y0,Y1) for x in range(W) if ambre(px[x,y]))
    vus=set(); comps=[]
    for p in S:
        if p in vus: continue
        pile=[p]; vus.add(p); c=[]
        while pile:
            q=pile.pop(); c.append(q)
            for d in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                n=(q[0]+d[0],q[1]+d[1])
                if n in S and n not in vus: vus.add(n); pile.append(n)
        comps.append(c)
    cand=[]
    for c in comps:
        xs=[p[0] for p in c]; ys=[p[1] for p in c]
        w=max(xs)-min(xs)+1; h=max(ys)-min(ys)+1
        if not(9<=w<=20 and 9<=h<=20): continue
        cx=(min(xs)+max(xs))/2.0; cy=(min(ys)+max(ys))/2.0
        trouve=False
        for dx in (-1,0,1):
            for dy in (-1,0,1):
                X,Y=int(round(cx))+dx,int(round(cy))+dy
                a=anneau(px,W,H,X,Y)
                if a<0.45: continue
                co=medlum(px,W,H,X,Y,(0.0,1.0,2.0),12)
                cr=medlum(px,W,H,X,Y,(9.0,9.6,10.2))
                if co<0.05 and cr<0.030:
                    cand.append((a,X,Y,w,h,len(c),co,cr)); trouve=True; break
            if trouve: break
    pris=[]
    for t in sorted(cand,reverse=True):
        if all(math.hypot(t[1]-p[1],t[2]-p[2])>9 for p in pris): pris.append(t)
    pris.sort(key=lambda t:(t[2],t[1]))
    print('   [%s] %d composantes ambre, %d candidates, %d MARQUEURS' % (nom,len(comps),len(cand),len(pris)))
    for i,(a,x,y,w,h,n,co,cr) in enumerate(pris):
        print('      B%02d (%4d,%4d) px = (%6.2f,%6.2f) CSS  anneau %.2f  coeur L %.4f  couronne L %.4f  [art y=%5d]'
              % (i+1,x,y,x/SC_CAPT,y/SC_CAPT,a,co,cr,y-Y0))
    print('   CONTROLE POSITIF : %s retrouve : %s' % (str(ref), any(math.hypot(x-ref[0],y-ref[1])<5 for _,x,y,_,_,_,_,_ in pris)))
    RES[nom]=[(x,y-Y0) for _,x,y,_,_,_,_,_ in pris]
    print()
a=set(RES['district2400']); b=set(RES['fiche1920']); c=set(RES['fiche2400'])
print('   CONCORDANCE (coordonnees ART) : district2400 %d ; fiche1920 %d ; fiche2400 %d ; communs aux 3 : %d' % (len(a),len(b),len(c),len(a&b&c)))
print('   a 2400 pas a 1920 :', sorted(a-b))
print('   a 1920 pas a 2400 :', sorted(b-a))
