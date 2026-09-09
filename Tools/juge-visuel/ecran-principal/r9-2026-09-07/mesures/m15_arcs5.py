# m15 — arcs : masque verifie visuellement + epaisseur = aire / longueur de la ligne moyenne.
# Controle positif : le canon doit rendre ~2,57 CSS (stroke-width 3.5 vb x 44/60) et R ~19,07 CSS (26 vb).
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
from PIL import Image
print('=== m15 arcs : aire/longueur ===')
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
def teal(c): return c[2]-c[0]>25 and c[1]-c[0]>15
def brais(c): return c[0]-c[1]>35 and c[0]-c[2]>35

CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94,587.45,130.85),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60),
     (F1920,'fiche1920',SC_CAPT,539.50,109.67,89.56,539.21,123.60)]
for path,nom,sc,mcx,mcy,mR,pvx,pvy in CFG:
    im=ouvrir(path,nom); px=im.load()
    lim=0.80*mR
    msk=Image.new('RGB',(int(2*lim)+2,int(2*lim)+2),(12,12,12)); mo=msk.load()
    print('   --- %s ---'%nom)
    for lab,pred,col in (('teal',teal,(0,255,255)),('braise',brais,(255,60,60))):
        pts=[]; cols=[]
        for y in range(int(mcy-lim),int(mcy+lim)):
            for x in range(int(mcx-lim),int(mcx+lim)):
                if math.hypot(x-mcx,y-mcy)>=lim: continue
                if y>pvy+2: continue
                if math.hypot(x-pvx,y-pvy)<7: continue
                c=px[x,y]
                if pred(c):
                    pts.append((x,y)); cols.append(c); mo[int(x-mcx+lim),int(y-mcy+lim)]=col
        if len(pts)<50: print('      %-7s : %d px'%(lab,len(pts))); continue
        cx,cy,R=fit_cercle(pts)
        for _ in range(3):
            pts2=[p for p in pts if abs(math.hypot(p[0]-cx,p[1]-cy)-R)<0.30*R+3]
            if len(pts2)<50: break
            pts=pts2; cx,cy,R=fit_cercle(pts)
        angs=sorted(math.degrees(math.atan2(-(p[1]-cy),p[0]-cx)) for p in pts)
        a0,a1=angs[1],angs[-2]; span=a1-a0
        L=R*math.radians(span)
        ep=len(pts)/L
        cc=(med([c[0] for c in cols]),med([c[1] for c in cols]),med([c[2] for c in cols]))
        # couleur de crete = mediane des 15% les plus satures
        cols2=sorted(cols, key=lambda c: -(abs(c[2]-c[0]) if lab=='teal' else (c[0]-c[1])))
        top=cols2[:max(6,len(cols2)//7)]
        ct=(med([c[0] for c in top]),med([c[1] for c in top]),med([c[2] for c in top]))
        print('      %-7s : %5d px ; centre/pivot dx=%+.2f dy=%+.2f CSS ; R=%.2f CSS ; etendue %.1f deg ; longueur %.2f CSS ; EPAISSEUR=%.2f CSS ; couleur de crete %s'
              % (lab,len(pts),(cx-pvx)/sc,(cy-pvy)/sc,R/sc,span,L/sc,ep/sc,str(tuple(int(v) for v in ct))))
    msk.resize((msk.width*3,msk.height*3),Image.NEAREST).save('vues/arcs5-%s.png'%nom)
