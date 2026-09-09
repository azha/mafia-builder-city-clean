# m41 — interieur de la fiche : filet haut, rythme vertical, boutons, separateurs de stats, couleurs.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m41 fiche : rythme, filet, boutons, separateurs ===')
# repere : canon .fiche a (13.00, 424.52) 366x169.19 ; jeu (11.98, 599.61) 368.04x169.50 (2400)
CFG=[(CANON,'canon',SC_CANON,13.00,424.52,366.00,169.19),
     (F2400,'jeu 2400',SC_CAPT,11.98,599.61,368.04,169.50),
     (F1920,'jeu 1920',SC_CAPT,11.98,599.61-240/SC_CAPT,368.04,169.50)]
for path,nom,sc,fx,fy,fw,fh in CFG:
    im=ouvrir(path,nom); px=im.load()
    X0,Y0=int(fx*sc),int(fy*sc); X1,Y1=int((fx+fw)*sc),int((fy+fh)*sc)
    print('   --- %s : plaque px (%d,%d)-(%d,%d) ---'%(nom,X0,Y0,X1,Y1))
    # 1) filet haut : ligne la plus chromatique dans les 8 premieres lignes
    best=None
    for y in range(Y0,Y0+int(8*sc)):
        c=medrgb(px,X0+int(60*sc),y,X1-int(60*sc),y+1)
        s=max(c)-min(c)
        if best is None or s>best[0]: best=(s,y,c)
    # etendue en x du filet
    yb=best[1]
    xs=[x for x in range(X0,X1) if max(px[x,yb])-min(px[x,yb])>25]
    print('      filet haut : y=%.2f CSS (relatif %.2f) ; couleur %s ; ecart a --laiton %d ; x %.2f..%.2f CSS (%.2f..%.2f relatif)'
          % (yb/sc,(yb-Y0)/sc,str(tuple(int(v) for v in best[2])),dist_rgb(best[2],TOK['laiton']),
             (min(xs)/sc if xs else -1),(max(xs)/sc if xs else -1),
             ((min(xs)-X0)/sc if xs else -1),((max(xs)-X0)/sc if xs else -1)))
    # 2) rythme : bandes d'encre claire
    print('      bandes d\'encre (L>0,12) dans la plaque :')
    cur=None
    for y in range(Y0,Y1):
        n=sum(1 for x in range(X0+4,X1-4) if lum(px[x,y])>0.12)
        if n>2:
            if cur is None: cur=[y,y,n]
            else: cur[1]=y; cur[2]=max(cur[2],n)
        else:
            if cur and cur[1]-cur[0]>=2:
                print('         y %6.2f..%6.2f relatif (haut %5.2f CSS) max %3d px' % ((cur[0]-Y0)/sc,(cur[1]-Y0)/sc,(cur[1]-cur[0]+1)/sc,cur[2]))
            cur=None
    if cur and cur[1]-cur[0]>=2:
        print('         y %6.2f..%6.2f relatif (haut %5.2f CSS) max %3d px' % ((cur[0]-Y0)/sc,(cur[1]-Y0)/sc,(cur[1]-cur[0]+1)/sc,cur[2]))
    # 3) fond de la plaque
    print('      fond de la plaque : haut %s  bas %s'
          % (str(medrgb(px,X0+int(20*sc),Y0+int(6*sc),X0+int(60*sc),Y0+int(10*sc))),
             str(medrgb(px,X0+int(20*sc),Y1-int(6*sc),X0+int(60*sc),Y1-int(2*sc)))))
