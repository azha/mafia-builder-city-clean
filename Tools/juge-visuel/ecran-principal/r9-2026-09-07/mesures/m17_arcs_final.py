# m17 — arcs, mesure FINALE. Repere = le PIVOT (verifie exact sur le canon : 90,8 deg vs 90 attendus,
# 61,0 deg vs 60,5 attendus). Epaisseur = aire / longueur de la ligne moyenne ; controle synthetique inclus.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m17 arcs : etendue angulaire autour du PIVOT + epaisseur (aire/longueur) ===')

# --- controle synthetique de l'ESTIMATEUR D'EPAISSEUR ---
syn=set()
for k in range(20000):
    a=math.radians(90+90*k/20000.0)
    for dr in [i*0.25-3.0 for i in range(25)]:
        syn.add((int(round(300+(57+dr)*math.cos(a))), int(round(200-(57+dr)*math.sin(a)))))
syn=list(syn)
angs=[math.degrees(math.atan2(-(p[1]-200),p[0]-300)) for p in syn]
span=max(angs)-min(angs); Rm=med([math.hypot(p[0]-300,p[1]-200) for p in syn])
print('   CONTROLE SYNTHETIQUE (R=57, epaisseur 6,25 px, 90 deg) : etendue mesuree %.1f deg ; R median %.2f ; epaisseur = aire/longueur = %.2f px'
      % (span, Rm, len(syn)/(Rm*math.radians(span))))

def teal(c): return c[2]-c[0]>25 and c[1]-c[0]>15
def brais(c): return c[0]-c[1]>28 and c[0]-c[2]>28
CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94,587.45,130.85,None),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60,None),
     (F1920,'fiche1920',SC_CAPT,539.50,109.67,89.56,539.21,123.60,None)]
res={}
for path,nom,sc,mcx,mcy,mR,pvx,pvy,_ in CFG:
    im=ouvrir(path,nom); px=im.load(); lim=0.80*mR
    print('   --- %s ---'%nom)
    for lab,pred in (('teal',teal),('braise',brais)):
        pts=[];cols=[]
        for y in range(int(mcy-lim),int(mcy+lim)):
            for x in range(int(mcx-lim),int(mcx+lim)):
                d=math.hypot(x-pvx,y-pvy)
                if math.hypot(x-mcx,y-mcy)>=lim or y>pvy+2: continue
                if d < 10.0*sc or d > 0.95*lim: continue
                c=px[x,y]
                if pred(c): pts.append((x,y)); cols.append(c)
        if len(pts)<50: print('      %-7s : %d px'%(lab,len(pts))); continue
        A=[math.degrees(math.atan2(-(p[1]-pvy),p[0]-pvx)) for p in pts]
        A=sorted(A); a0,a1=A[1],A[-2]; span=a1-a0
        Rs=[math.hypot(p[0]-pvx,p[1]-pvy) for p in pts]
        Rm=med(Rs)
        ep=len(pts)/(Rm*math.radians(span))
        cols2=sorted(cols,key=lambda c:-(abs(c[2]-c[0]) if lab=='teal' else (c[0]-c[1])))
        top=cols2[:max(6,len(cols2)//7)]
        ct=tuple(int(med([c[i] for c in top])) for i in range(3))
        res[(nom,lab)]=(a0,a1,Rm/sc,ep/sc,ct)
        print('      %-7s : %4d px ; angles autour du pivot %+7.1f .. %+7.1f deg (etendue %5.1f) ; R median %5.2f CSS (%.2f..%.2f) ; EPAISSEUR %.2f CSS ; crete %s'
              % (lab,len(pts),a0,a1,span,Rm/sc,min(Rs)/sc,max(Rs)/sc,ep/sc,str(ct)))
    if (nom,'teal') in res and (nom,'braise') in res:
        t=res[(nom,'teal')]; b=res[(nom,'braise')]
        print('      VIDE entre la fin du braise (%.1f) et le debut du teal (%.1f) : %.1f deg' % (b[1], t[0], t[0]-b[1]))
