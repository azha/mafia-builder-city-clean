# m47 — comparaison 1080x1920 / 1080x2400 : boite de la fiche, gouttieres, elements coupes.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m47 comparaison des resolutions ===')
def plaque(path,nom,H):
    im=ouvrir(path,nom); px=im.load(); W=im.size[0]
    # filet laiton de la fiche : la ligne la plus laiton dans la moitie basse
    best=None
    for y in range(int(H*0.5),H-40):
        c=medrgb(px,int(W*0.35),y,int(W*0.65),y+1)
        d=dist_rgb(c,TOK['laiton'])
        if best is None or d<best[0]: best=(d,y,c)
    yf=best[1]
    print('   [%s] filet de la fiche : y=%d px = %.2f CSS ; couleur %s (ecart laiton %d)' % (nom,yf,yf/SC_CAPT,str(tuple(int(v) for v in best[2])),best[0]))
    # bords de la plaque : lignes ou la couleur de fond de plaque (sombre uniforme) existe sur une longue plage
    xs=[x for x in range(W) if dist_rgb(px[x,yf],TOK['laiton'])<70]
    print('        filet en x %d..%d px = %.2f..%.2f CSS' % (min(xs),max(xs),min(xs)/SC_CAPT,max(xs)/SC_CAPT))
    # bas de la plaque : derniere ligne ou la colonne x=W/2 est tres sombre et uniforme
    y=yf+10; bas=yf
    while y<H-1:
        c=medrgb(px,int(W*0.05),y,int(W*0.12),y+1)
        if lum(c)<0.020: bas=y
        else: break
        y+=1
    print('        plaque : y %d..%d px = %.2f..%.2f CSS (hauteur %.2f CSS)' % (yf,bas,yf/SC_CAPT,bas/SC_CAPT,(bas-yf+1)/SC_CAPT))
    return yf,bas
for path,nom,H in [(F1920,'fiche 1920',1920),(F2400,'fiche 2400',2400)]:
    yf,bas=plaque(path,nom,H)
    im=ouvrir(path,nom); px=im.load()
    # dock : premiere ligne du rond (bord clair)
    # gouttiere plaque -> haut du 1er rond
    ytop=None
    for y in range(bas+1,H):
        row=[lum(px[x,y]) for x in range(200,340)]
        if max(row)>0.028: ytop=y; break
    print('        gouttiere plaque -> dock : %.2f CSS (de y=%d a y=%s)' % (((ytop-bas)/SC_CAPT) if ytop else -1,bas,ytop))
    print('        bas de l ecran - bas de la plaque : %.2f CSS' % ((H-1-bas)/SC_CAPT))
    print()
