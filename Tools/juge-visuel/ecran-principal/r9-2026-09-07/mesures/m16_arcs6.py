# m16 — arcs, version corrigee (deroulement des angles). CONTROLE POSITIF SYNTHETIQUE inclus.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m16 arcs (angles deroules) ===')
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

# --- controle positif synthetique : arc de 90 deg, R=57, centre (300,200), epaisseur 7 ---
syn=[]
for k in range(4000):
    a=math.radians(90+90*k/4000.0)
    for dr in [i*0.5-3.0 for i in range(13)]:
        syn.append((300+(57+dr)*math.cos(a), 200-(57+dr)*math.sin(a)))
syn=[(int(round(x)),int(round(y))) for x,y in syn]
syn=list(set(syn))
cx,cy,R=fit_cercle(syn)
med_a=med([math.degrees(math.atan2(-(p[1]-cy),p[0]-cx)) for p in syn])
def deroule(a,ref):
    while a-ref>180: a-=360
    while a-ref<-180: a+=360
    return a
A2=[deroule(math.degrees(math.atan2(-(p[1]-cy),p[0]-cx)),med_a) for p in syn]
print('   CONTROLE SYNTHETIQUE : centre attendu (300,200) R=57 etendue 90 deg -> mesure centre (%.2f,%.2f) R=%.2f etendue %.1f deg'
      % (cx,cy,R,max(A2)-min(A2)))

def teal(c): return c[2]-c[0]>25 and c[1]-c[0]>15
def brais(c): return c[0]-c[1]>35 and c[0]-c[2]>35
CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94,587.45,130.85),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60),
     (F1920,'fiche1920',SC_CAPT,539.50,109.67,89.56,539.21,123.60)]
for path,nom,sc,mcx,mcy,mR,pvx,pvy in CFG:
    im=ouvrir(path,nom); px=im.load(); lim=0.80*mR
    print('   --- %s (pivot %.2f,%.2f CSS) ---'%(nom,pvx/sc,pvy/sc))
    for lab,pred in (('teal',teal),('braise',brais)):
        pts=[];cols=[]
        for y in range(int(mcy-lim),int(mcy+lim)):
            for x in range(int(mcx-lim),int(mcx+lim)):
                if math.hypot(x-mcx,y-mcy)>=lim or y>pvy+2: continue
                if math.hypot(x-pvx,y-pvy)<7: continue
                c=px[x,y]
                if pred(c): pts.append((x,y)); cols.append(c)
        if len(pts)<50: print('      %-7s : %d px'%(lab,len(pts))); continue
        cx,cy,R=fit_cercle(pts)
        for _ in range(3):
            q=[p for p in pts if abs(math.hypot(p[0]-cx,p[1]-cy)-R)<0.35*R+3]
            if len(q)<50: break
            pts=q; cx,cy,R=fit_cercle(pts)
        raw=[math.degrees(math.atan2(-(p[1]-cy),p[0]-cx)) for p in pts]
        ref=med(raw)
        A2=sorted(deroule(a,ref) for a in raw)
        a0,a1=A2[1],A2[-2]; span=a1-a0
        L=R*math.radians(span); ep=len(pts)/L
        cols2=sorted(cols,key=lambda c:-(abs(c[2]-c[0]) if lab=='teal' else (c[0]-c[1])))
        top=cols2[:max(6,len(cols2)//7)]
        ct=tuple(int(med([c[i] for c in top])) for i in range(3))
        # angles rapportes au PIVOT
        rawp=[deroule(math.degrees(math.atan2(-(p[1]-pvy),p[0]-pvx)),ref) for p in pts]
        print('      %-7s : %5d px ; R=%.2f CSS ; centre/pivot dx=%+.2f dy=%+.2f CSS ; etendue %.1f deg (%.1f..%.1f, autour du centre de courbure)'
              % (lab,len(pts),R/sc,(cx-pvx)/sc,(cy-pvy)/sc,span,a0,a1))
        print('               autour du PIVOT : %.1f..%.1f deg (etendue %.1f) ; EPAISSEUR=%.2f CSS ; couleur de crete %s'
              % (min(rawp),max(rawp),max(rawp)-min(rawp),ep/sc,str(ct)))
