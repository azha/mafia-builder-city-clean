# m44 — boites des 3 boutons : balayage a y relatif 120 CSS (dans le corps, au-dessus du texte)
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m44 boites des boutons ===')
CFG=[(CANON,'canon',SC_CANON,13.00,424.52,366.00),(F2400,'jeu 2400',SC_CAPT,11.98,599.61,368.04)]
for path,nom,sc,fx,fy,fw in CFG:
    im=ouvrir(path,nom); px=im.load()
    X0=int(fx*sc)
    for yy in (120.0,122.0,150.0):
        ya=int((fy+yy)*sc)
        base=med([lum(px[x,ya]) for x in range(X0,int((fx+fw)*sc))])
        runs=[]; cur=None
        for x in range(X0,int((fx+fw)*sc)):
            on = lum(px[x,ya])>base*1.35+0.002
            if on:
                if cur is None: cur=[x,x]
                else: cur[1]=x
            else:
                if cur and cur[1]-cur[0]>int(8*sc): runs.append(tuple(cur))
                cur=None
        if cur and cur[1]-cur[0]>int(8*sc): runs.append(tuple(cur))
        print('   [%s] y relatif %5.1f : %d boutons ; %s' % (nom,yy,len(runs),
              ' | '.join('%.2f..%.2f (%.2f CSS)'%((a-X0)/sc,(b-X0)/sc,(b-a+1)/sc) for a,b in runs)))
        if len(runs)==3:
            print('        gouttieres : %.2f et %.2f CSS ; marges : gauche %.2f, droite %.2f CSS'
                  % ((runs[1][0]-runs[0][1]-1)/sc,(runs[2][0]-runs[1][1]-1)/sc,(runs[0][0]-X0)/sc,(fw-(runs[2][1]-X0)/sc)))
    # rayon des coins du CTA
    a=None
    ya=int((fy+120)*sc)
    print()
