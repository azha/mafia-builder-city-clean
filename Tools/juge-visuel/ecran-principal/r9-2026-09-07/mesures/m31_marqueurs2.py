# m31 — marqueurs de batiment, gabarit CALIBRE sur le marqueur "Laboratoire" (491,784) :
#   anneau ambre a r = 5,7..6,9 px (fraction >= 0,45 sur 32 angles), coeur sombre (L<0,045) a r<=2,
#   couronne sombre a r = 9..10 (L<0,020). Controles positif ET negatif imprimes.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m31 marqueurs de batiment (gabarit calibre) ===')
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
def coeur(px,W,H,x,y):
    v=[]
    for dx in range(-2,3):
        for dy in range(-2,3):
            if dx*dx+dy*dy<=4:
                xi,yi=x+dx,y+dy
                if 0<=xi<W and 0<=yi<H: v.append(lum(px[xi,yi]))
    return med(v)
def couronne(px,W,H,x,y):
    v=[]
    for r in (9.0,9.6,10.2):
        for k in range(24):
            xi=int(round(x+r*math.cos(2*math.pi*k/24))); yi=int(round(y+r*math.sin(2*math.pi*k/24)))
            if 0<=xi<W and 0<=yi<H: v.append(lum(px[xi,yi]))
    return med(v)

for path,nom,Y0,Y1,ref in [(DIST,'district2400',240,2160,(491,784)),
                           (F1920,'fiche1920',0,1920,(491,544))]:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    cand=[]
    for y in range(Y0+11,Y1-11):
        for x in range(11,W-11):
            if coeur(px,W,H,x,y)>=0.05: continue
            a=anneau(px,W,H,x,y)
            if a<0.45: continue
            cr=couronne(px,W,H,x,y)
            if cr>=0.030: continue
            cand.append((a,-cr,x,y))
    cand.sort(reverse=True)
    pris=[]
    for a,ncr,x,y in cand:
        if all(math.hypot(x-p[2],y-p[3])>9 for p in pris): pris.append((a,ncr,x,y))
    pris.sort(key=lambda p:(p[3],p[2]))
    print('   [%s] %d centres candidats -> %d marqueurs' % (nom,len(cand),len(pris)))
    for i,(a,ncr,x,y) in enumerate(pris):
        print('      B%02d (%4d,%4d) px = (%6.2f,%6.2f) CSS   anneau %.2f  couronne L %.4f  [art y=%5d]'
              % (i+1,x,y,x/SC_CAPT,y/SC_CAPT,a,-ncr,y-Y0))
    print('   CONTROLE POSITIF : marqueur de reference %s retrouve : %s'
          % (str(ref), any(math.hypot(x-ref[0],y-ref[1])<5 for _,_,x,y in pris)))
    # controle negatif : une fenetre de fenetres eclairees, sans marqueur
    faux=[p for p in pris if 60<=p[2]<=200 and Y0+1250<=p[3]<=Y0+1400]
    print('   (fenetre de controle negatif x 60..200, art y 1250..1400 : %d marqueurs)' % len(faux))
