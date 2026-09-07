# m43 — boutons de la fiche : boites, rayon, degrade du CTA, filets ; separateurs de stats ; couleurs des textes
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m43 boutons, separateurs, couleurs de texte de la fiche ===')
CFG=[(CANON,'canon',SC_CANON,13.00,424.52,366.00,169.19),
     (F2400,'jeu 2400',SC_CAPT,11.98,599.61,368.04,169.50)]
for path,nom,sc,fx,fy,fw,fh in CFG:
    im=ouvrir(path,nom); px=im.load()
    X0,Y0=int(fx*sc),int(fy*sc)
    print('   --- %s ---'%nom)
    # ligne des actions : y relatif ~135 CSS
    ya=int((fy+135)*sc)
    runs=[]; cur=None
    for x in range(X0,int((fx+fw)*sc)):
        c=px[x,ya]
        clair = lum(c)>0.02
        if clair:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur and cur[1]-cur[0]>10: runs.append(tuple(cur))
            cur=None
    if cur and cur[1]-cur[0]>10: runs.append(tuple(cur))
    print('      boutons a y=%.1f CSS : %d ; ' % (135.0,len(runs)) +
          ' | '.join('x %.2f..%.2f (%.2f CSS)'%((a-X0)/sc,(b-X0)/sc,(b-a+1)/sc) for a,b in runs))
    if len(runs)>=2:
        print('      ecarts entre boutons : ' + ' , '.join('%.2f CSS'%((runs[i+1][0]-runs[i][1]-1)/sc) for i in range(len(runs)-1)))
    # degrade vertical du CTA (5 hauteurs)
    if runs:
        a,b=runs[0]; cx=(a+b)//2
        y0=int((fy+115)*sc); y1=int((fy+155)*sc)
        ech=[medrgb(px,cx-int(6*sc),y,cx+int(6*sc),y+1) for y in
             [int(y0+(y1-y0)*k/5.0)+int(2*sc) for k in range(5)]]
        print('      CTA degrade vertical : ' + ' -> '.join(str(tuple(int(v) for v in c)) for c in ech))
        # boite du CTA en hauteur
        col=[y for y in range(y0-int(6*sc),y1+int(6*sc)) if lum(medrgb(px,cx-int(4*sc),y,cx+int(4*sc),y+1))>0.10]
        if col: print('      CTA boite : y %.2f..%.2f relatif (haut %.2f CSS) x %.2f (%.2f CSS de large)'
                      % ((min(col)-Y0)/sc,(max(col)-Y0)/sc,(max(col)-min(col)+1)/sc,(a-X0)/sc,(b-a+1)/sc))
    # separateurs de stats : colonnes faiblement claires dans la bande des stats
    yb0=int((fy+70)*sc); yb1=int((fy+100)*sc)
    cols=[]
    for x in range(X0+int(20*sc), int((fx+fw-20)*sc)):
        v=[lum(px[x,y]) for y in range(yb0,yb1)]
        cols.append((x,med(v)))
    base=med([v for _,v in cols])
    pics=[(x,v) for x,v in cols if v>base*1.6 and v<0.05]
    grp=[]; cur=None
    for x,v in pics:
        if cur is None or x-cur[-1]>3:
            if cur and len(cur)>=2: grp.append(cur)
            cur=[x]
        else: cur.append(x)
    if cur and len(cur)>=2: grp.append(cur)
    print('      separateurs de stats : %s' % ' , '.join('centre %.2f CSS (%d px)'%(((g[0]+g[-1])/2-X0)/sc,len(g)) for g in grp))
