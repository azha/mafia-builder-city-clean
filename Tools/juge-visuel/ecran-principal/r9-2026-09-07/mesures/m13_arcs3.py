# m13 — arcs : classification par TEINTE (teal: b-r ; braise: r-g), fond du cadran soustrait.
# Controle positif : sur le canon, l'epaisseur doit retrouver la source (stroke-width 3.5 vb x 0.7333 = 2.567 CSS)
# et le rayon 26 vb x 0.7333 = 19.07 CSS ... (le r8 a mesure 18.20 : on verifie).
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
from PIL import Image
print('=== m13 arcs : teinte, rayon, etendue, epaisseur ===')

def fit_cercle(pts,w=None):
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

CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94,587.45,130.85),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60),
     (F1920,'fiche1920',SC_CAPT,539.50,109.67,89.56,539.21,123.60),
     (F2400,'fiche2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60)]

def s_teal(c): return c[2]-c[0]
def s_brais(c): return c[0]-c[1]

for path,nom,sc,mcx,mcy,mR,pvx,pvy in CFG:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    lim=0.80*mR
    fond=[px[x,y] for y in range(int(mcy-lim),int(mcy+lim)) for x in range(int(mcx-lim),int(mcx+lim))
          if math.hypot(x-mcx,y-mcy)<lim and abs(x-mcx)>0.55*lim and y<pvy]
    bt=med([s_teal(c) for c in fond]); bb=med([s_brais(c) for c in fond])
    print('   --- %s --- fond du cadran (coins hauts) : teal %.1f  braise %.1f  couleur mediane %s'
          % (nom,bt,bb,str(medrgb(px,int(mcx-lim*0.9),int(mcy-lim*0.9),int(mcx-lim*0.75),int(mcy-lim*0.75)))))
    masque=Image.new('RGB',(int(2*lim)+2,int(2*lim)+2),(15,15,15)); mo=masque.load()
    for lab,sig,base,SEUIL,col in (('teal',s_teal,bt,25,(0,255,255)),('braise',s_brais,bb,35,(255,60,60))):
        pts=[]
        for y in range(int(mcy-lim),int(mcy+lim)):
            for x in range(int(mcx-lim),int(mcx+lim)):
                if math.hypot(x-mcx,y-mcy)>=lim: continue
                if y>pvy+2: continue
                if math.hypot(x-pvx,y-pvy)<7: continue
                if sig(px[x,y])-base>=SEUIL:
                    pts.append((x,y)); mo[int(x-mcx+lim),int(y-mcy+lim)]=col
        if len(pts)<40: print('      %-7s : %d px (trop peu)'%(lab,len(pts))); continue
        cx,cy,R=fit_cercle(pts)
        for _ in range(3):
            pts=[p for p in pts if abs(math.hypot(p[0]-cx,p[1]-cy)-R)<0.10*R+4]
            cx,cy,R=fit_cercle(pts)
        angs=sorted(math.degrees(math.atan2(-(p[1]-cy),p[0]-cx)) for p in pts)
        a0,a1=angs[2],angs[-3]
        eps=[]
        for k in range(30):
            a=math.radians(a0+(a1-a0)*(k+0.5)/30.0)
            prof=[]; rr=max(2.0,R-12)
            while rr<=R+12:
                xi=cx+rr*math.cos(a); yi=cy-rr*math.sin(a)
                xq,yq=int(xi),int(yi); fx,fy=xi-xq,yi-yq
                if 0<=xq<W-1 and 0<=yq<H-1:
                    v=(sig(px[xq,yq])*(1-fx)*(1-fy)+sig(px[xq+1,yq])*fx*(1-fy)
                       +sig(px[xq,yq+1])*(1-fx)*fy+sig(px[xq+1,yq+1])*fx*fy)-base
                    prof.append((rr,v))
                rr+=0.1
            if not prof: continue
            vmax=max(v for _,v in prof)
            if vmax<40: continue
            rs=[r for r,v in prof if v>=vmax/2.0]
            if rs and (max(rs)-min(rs))<0.35*R: eps.append(max(rs)-min(rs))
        print('      %-7s : %5d px ; centre (%.2f,%.2f) CSS ; R=%.2f CSS ; angles %+.1f..%+.1f (etendue %.1f) ; epaisseur %s CSS (n=%d) ; centre/pivot dx=%+.2f dy=%+.2f'
              % (lab,len(pts),cx/sc,cy/sc,R/sc,a0,a1,a1-a0,('%.2f'%(med(eps)/sc)) if eps else '--',len(eps),(cx-pvx)/sc,(cy-pvy)/sc))
    masque.resize((masque.width*3,masque.height*3),Image.NEAREST).save('vues/arcs-%s.png'%nom)
