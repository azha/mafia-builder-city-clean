# m12 — arcs : mesure propre. Region = disque interieur (r<0.80 Rmed) et y<=pivot+3 ; ring exclu par rayon.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
from PIL import Image
print('=== m12 arcs (region restreinte au cadran) ===')

def fit_cercle(pts):
    n=len(pts); sx=sy=sxx=syy=sxy=sz=szx=szy=0.0
    for x,y in pts:
        z=x*x+y*y; sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; sz+=z; szx+=z*x; szy+=z*y
    A=[[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,float(n)]]; b=[-szx,-szy,-sz]
    for i in range(3):
        p=max(range(i,3), key=lambda k: abs(A[k][i])); A[i],A[p]=A[p],A[i]; b[i],b[p]=b[p],b[i]
        for k in range(i+1,3):
            f=A[k][i]/A[i][i]
            for j in range(i,3): A[k][j]-=f*A[i][j]
            b[k]-=f*b[i]
    s=[0,0,0]
    for i in (2,1,0): s[i]=(b[i]-sum(A[i][j]*s[j] for j in range(i+1,3)))/A[i][i]
    D,E,F=s; cx=-D/2; cy=-E/2
    return cx,cy,math.sqrt(max(0,cx*cx+cy*cy-F))

def sig_teal(c): return (c[2]-c[0])          # bleu moins rouge
def sig_brais(c): return (c[0]-c[2])         # rouge moins bleu

CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94,587.45,130.85),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60),
     (F1920,'fiche1920',SC_CAPT,539.50,109.67,89.56,539.21,123.60)]

for path,nom,sc,mcx,mcy,mR,pvx,pvy in CFG:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    lim = 0.80*mR
    fond=[]
    for y in range(int(mcy-lim),int(mcy+lim)):
        for x in range(int(mcx-lim),int(mcx+lim)):
            if math.hypot(x-mcx,y-mcy)<lim and y>pvy+8:
                fond.append(px[x,y])
    base_t = med([sig_teal(c) for c in fond]); base_b = med([sig_brais(c) for c in fond])
    print('   --- %s --- fond du cadran : signal teal %.1f, braise %.1f' % (nom,base_t,base_b))
    res={}
    for lab,sig,base,seuil in (('teal',sig_teal,base_t,22),('braise',sig_brais,base_b,22)):
        pts=[]
        for y in range(int(mcy-lim),int(mcy+lim)):
            for x in range(int(mcx-lim),int(mcx+lim)):
                if math.hypot(x-mcx,y-mcy)>=lim: continue
                if y>pvy+3: continue
                if math.hypot(x-pvx,y-pvy)<7: continue
                if sig(px[x,y]) - base >= seuil: pts.append((x,y))
        if len(pts)<40: print('      %-7s : %d px'%(lab,len(pts))); continue
        cx,cy,R=fit_cercle(pts)
        angs=sorted(math.degrees(math.atan2(-(p[1]-cy),p[0]-cx)) for p in pts)
        a0,a1=angs[2],angs[-3]
        eps=[]
        for k in range(30):
            a=math.radians(a0+(a1-a0)*(k+0.5)/30.0)
            prof=[]; rr=max(2.0,R-13)
            while rr<=R+13:
                xi=cx+rr*math.cos(a); yi=cy-rr*math.sin(a)
                xq,yq=int(xi),int(yi); fx,fy=xi-xq,yi-yq
                if 0<=xq<W-1 and 0<=yq<H-1:
                    v=(sig(px[xq,yq])*(1-fx)*(1-fy)+sig(px[xq+1,yq])*fx*(1-fy)
                       +sig(px[xq,yq+1])*(1-fx)*fy+sig(px[xq+1,yq+1])*fx*fy)
                    prof.append((rr,v-base))
                rr+=0.1
            if not prof: continue
            vmax=max(v for _,v in prof)
            if vmax<30: continue
            s=vmax/2.0
            rs=[r for r,v in prof if v>=s]
            if rs and (max(rs)-min(rs))<12: eps.append(max(rs)-min(rs))
        res[lab]=(cx,cy,R,a0,a1,med(eps) if eps else None,len(eps),len(pts))
        print('      %-7s : %5d px ; centre (%.2f,%.2f) CSS ; R=%.2f CSS ; angles %+.1f..%+.1f (etendue %.1f deg) ; epaisseur mi-hauteur %s CSS (n=%d)'
              % (lab,len(pts),cx/sc,cy/sc,R/sc,a0,a1,a1-a0,('%.2f'%(med(eps)/sc)) if eps else '--',len(eps)))
        print('           centre / PIVOT : dx=%+.2f dy=%+.2f CSS' % ((cx-pvx)/sc,(cy-pvy)/sc))
    if 'teal' in res and 'braise' in res:
        # vide entre la fin du teal (angle max) et le debut du braise (angle max cote +) autour du PIVOT
        def angp(px_,py_): return math.degrees(math.atan2(-(py_-pvy),px_-pvx))
        print('           VIDE entre arcs (conv. pivot) : teal fin %.1f deg -> braise debut %.1f deg'
              % (res['teal'][4], res['braise'][4]))
