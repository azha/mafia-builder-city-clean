# m24 — volutes et bouton retour : encre claire dans les bords du bandeau (seuil bas, l'opacite du canon est .28)
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m24 volutes / bouton retour (bords du bandeau) ===')
CFG=[(CANON,'canon',SC_CANON,1176),(DIST,'district2400',SC_CAPT,1080),(F1920,'fiche1920',SC_CAPT,1080)]
for path,nom,sc,W in CFG:
    im=ouvrir(path,nom); px=im.load()
    print('   --- %s ---'%nom)
    for lab,x0,x1 in (('GAUCHE 0..62 CSS',0,int(62*sc)),('DROITE 340..392 CSS',int(340*sc),W)):
        # fond local = mediane de la bande hors encre
        fond=medrgb(px,x0,int(6*sc),x1,int(12*sc))
        pts=[]
        for y in range(int(12*sc),int(46*sc)):
            for x in range(x0,x1):
                c=px[x,y]
                if lum(c)-lum(fond) > 0.010 and max(c)-min(c)<70:
                    pts.append((x,y))
        if not pts:
            print('      %-20s : 0 px au-dessus du fond %s' % (lab,str(fond))); continue
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        # composantes
        S=set(pts); vus=set(); comps=[]
        for p in pts:
            if p in vus: continue
            pile=[p]; vus.add(p); c=[]
            while pile:
                q=pile.pop(); c.append(q)
                for d in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                    n=(q[0]+d[0],q[1]+d[1])
                    if n in S and n not in vus: vus.add(n); pile.append(n)
            comps.append(c)
        comps.sort(key=len,reverse=True)
        print('      %-20s : %d px, fond %s ; bbox CSS x %.2f..%.2f y %.2f..%.2f'
              % (lab,len(pts),str(fond),min(xs)/sc,max(xs)/sc,min(ys)/sc,max(ys)/sc))
        for c in comps[:4]:
            cx=[p[0] for p in c]; cy=[p[1] for p in c]
            if len(c)<12: continue
            print('           composante %4d px : x %6.2f..%6.2f (%5.2f) y %6.2f..%6.2f (%5.2f) CSS'
                  % (len(c),min(cx)/sc,max(cx)/sc,(max(cx)-min(cx)+1)/sc,min(cy)/sc,max(cy)/sc,(max(cy)-min(cy)+1)/sc))
