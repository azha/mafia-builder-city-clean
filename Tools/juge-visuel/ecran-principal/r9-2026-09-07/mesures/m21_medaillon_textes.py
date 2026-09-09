# m21 — textes du medaillon (heatpct / heatlib) : boite d'encre, hauteur de capitale,
# position par rapport au CENTRE du boitier, degagement au cerclage.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m21 heatpct + heatlib ===')
def creme(c):
    r,g,b=c; return r>150 and g>145 and b>120 and abs(r-g)<25 and 0<=r-b<=70
def braisep(c):
    r,g,b=c; return c[0]-c[1]>60 and c[0]-c[2]>60 and c[0]>140
CFG=[(CANON,'canon "37%" / "HEAT"',SC_CANON,587.49,116.52,93.94,587.45,130.85,creme),
     (DIST,'jeu "Brulant" / "CHALEUR"',SC_CAPT,539.50,109.67,89.56,539.21,123.60,braisep),
     (F1920,'jeu1920',SC_CAPT,539.50,109.67,89.56,539.21,123.60,braisep)]
for path,nom,sc,mcx,mcy,mR,pvx,pvy,predpct in CFG:
    im=ouvrir(path,nom); px=im.load()
    lim=0.98*mR
    # bandes horizontales d'encre SOUS le pivot
    for lab,pred in (('heatpct',predpct),('heatlib',creme)):
        rows={}
        for y in range(int(pvy-2), int(mcy+lim)):
            xs=[x for x in range(int(mcx-lim),int(mcx+lim))
                if math.hypot(x-mcx,y-mcy)<lim-3 and pred(px[x,y])]
            if xs: rows[y]=(min(xs),max(xs),len(xs))
        if not rows: print('      %-8s : rien'%lab); continue
        ys=sorted(rows); bandes=[]; cur=[ys[0]]
        for y in ys[1:]:
            if y-cur[-1]<=1: cur.append(y)
            else: bandes.append(cur); cur=[y]
        bandes.append(cur)
        for b in bandes:
            if len(b)<4: continue
            x0=min(rows[y][0] for y in b); x1=max(rows[y][1] for y in b)
            print('      %-8s [%s] : bbox CSS x %6.2f..%6.2f (larg %5.2f) y %6.2f..%6.2f (haut %5.2f) ; centre y / centre du boitier %+.2f CSS'
                  % (lab,nom.split()[0],x0/sc,x1/sc,(x1-x0+1)/sc,b[0]/sc,b[-1]/sc,(b[-1]-b[0]+1)/sc,((b[0]+b[-1])/2-mcy)/sc))
            # degagement : coin d'encre le plus eloigne du centre du boitier, rapporte au rayon interieur nominal
            dmax=0; pmax=None
            for y in b:
                for x in (rows[y][0], rows[y][1]):
                    d=math.hypot(x-mcx,y-mcy)
                    if d>dmax: dmax=d; pmax=(x,y)
            rint = mR - 1.5*sc/2.0
            print('               coin le plus loin : %.2f CSS du centre = %.3f R_int ; degagement au bord interieur nominal = %.2f CSS'
                  % (dmax/sc, dmax/rint, (rint-dmax)/sc))
    print()
