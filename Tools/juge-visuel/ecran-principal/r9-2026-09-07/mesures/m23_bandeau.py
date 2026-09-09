# m23 — bandeau : filet, aile droite, volutes g/d, losange, barre de ratio, bandeau-alerte
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m23 bandeau : filet, aile droite, volutes, losange, ratio, alerte ===')

CFG=[(CANON,'canon',SC_CANON,1176,587.49,116.52,93.94),
     (DIST,'district2400',SC_CAPT,1080,539.50,109.67,89.56),
     (F1920,'fiche1920',SC_CAPT,1080,539.50,109.67,89.56)]
for path,nom,sc,W,mcx,mcy,mR in CFG:
    im=ouvrir(path,nom); px=im.load(); H=im.size[1]
    print('   --- %s ---'%nom)
    # 1) FILET : ligne la plus chromatique autour de y=52 CSS, mesuree loin du medaillon
    best=None
    for y in range(int(46*sc), int(58*sc)):
        c=medrgb(px, int(60*sc), y, int(140*sc), y+1)
        s=max(c)-min(c)
        if best is None or s>best[0]: best=(s,y,c)
    print('      filet : y=%.2f CSS ; couleur %s ; ecart a --laiton %d ; a --braise %d'
          % (best[1]/sc, str(tuple(int(v) for v in best[2])), dist_rgb(best[2],TOK['laiton']), dist_rgb(best[2],TOK['braise'])))
    # 2) BARRE DE RATIO : la ligne sous le montant
    for y in range(int(38*sc), int(48*sc)):
        row=[px[x,y] for x in range(int(10*sc), int(140*sc))]
        n=sum(1 for c in row if dist_rgb(c,TOK['or'])<40 or dist_rgb(c,TOK['orvif'])<40)
        if n>20:
            xs=[x for x in range(int(10*sc),int(140*sc)) if dist_rgb(px[x,y],TOK['or'])<40 or dist_rgb(px[x,y],TOK['orvif'])<40]
            # a droite du remplissage : cherche la piste (gris bleute #5a6376)
            x1=max(xs); piste=[]
            for x in range(x1+1, x1+int(60*sc)):
                c=px[x,y]
                if dist_rgb(c,(90,99,118))<30: piste.append(x)
            print('      ratio y=%.2f : remplissage x %.2f..%.2f CSS (%.2f CSS) couleur %s ; piste (90,99,118) : %d px%s'
                  % (y/sc, min(xs)/sc, x1/sc, (x1-min(xs)+1)/sc, str(px[(min(xs)+x1)//2, y]), len(piste),
                     (' x %.2f..%.2f'%(min(piste)/sc,max(piste)/sc)) if piste else ''))
            break
    # 3) VOLUTES : encre claire dans les 20 premiers CSS et les 20 derniers, hors texte
    for lab,x0,x1 in (('gauche',0,int(20*sc)),('droite',int(372*sc),int(392*sc))):
        n=0; bb=[9e9,9e9,-1,-1]
        for y in range(int(18*sc),int(36*sc)):
            for x in range(x0,min(x1,W)):
                c=px[x,y]
                if c[0]>90 and c[1]>90 and c[2]>80 and max(c)-min(c)<60:
                    n+=1; bb=[min(bb[0],x),min(bb[1],y),max(bb[2],x),max(bb[3],y)]
        print('      volute %-7s : %4d px%s' % (lab,n, ('' if n==0 else ' bbox CSS x %.2f..%.2f y %.2f..%.2f'%(bb[0]/sc,bb[2]/sc,bb[1]/sc,bb[3]/sc))))
    # 4) LOSANGE sous le medaillon
    pts=[(x,y) for y in range(int(mcy+mR-2), int(mcy+mR+8*sc)) for x in range(int(mcx-8*sc),int(mcx+8*sc))
         if dist_rgb(px[x,y],TOK['laiton'])<45]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        print('      losange : %d px ; bbox CSS x %.2f..%.2f y %.2f..%.2f ; centre x %.2f' %
              (len(pts),min(xs)/sc,max(xs)/sc,min(ys)/sc,max(ys)/sc,(min(xs)+max(xs))/2/sc))
    else: print('      losange : ABSENT')
    # 5) BANDEAU-ALERTE : encre claire ou or-vif dans la bande y 78..113 CSS
    n_or=0; n_cl=0
    for y in range(int(78*sc), int(113*sc)):
        for x in range(int(20*sc), int(372*sc)):
            c=px[x,y]
            if dist_rgb(c,TOK['orvif'])<45: n_or+=1
            if c[0]>190 and c[1]>185 and c[2]>165: n_cl+=1
    print('      bande d\'alerte y 78..113 CSS : or-vif %d px ; encre claire %d px' % (n_or,n_cl))
