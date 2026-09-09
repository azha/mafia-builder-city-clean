# m49 — ronds du dock par leur BORD (1px #ffffff22) : maxima locaux de luminance sur la ligne mediane.
# Controle positif : le canon doit rendre 46,00 CSS et des centres a 93,67/161,67/229,67/297,67.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m49 ronds du dock (par le bord) ===')
for nom,path,ym,sc,W in (('canon',CANON,1915,SC_CANON,1176),('jeu 2400',DIST,2247,SC_CAPT,1080),('jeu 1920',F1920,1767,SC_CAPT,1080)):
    im=ouvrir(path,nom); px=im.load()
    L1=[lum(px[x,ym]) for x in range(W)]
    # bords = maxima locaux nets
    pics=[]
    for x in range(2,W-2):
        if L1[x]>=L1[x-1] and L1[x]>=L1[x+1] and L1[x]-min(L1[max(0,x-6):x+7])>0.004:
            pics.append(x)
    grp=[];cur=None
    for x in pics:
        if cur is None or x-cur[-1]>3:
            if cur: grp.append(cur)
            cur=[x]
        else: cur.append(x)
    if cur: grp.append(cur)
    cen=[ (g[0]+g[-1])/2.0 for g in grp]
    print('   [%s] y=%d : %d bords a x = %s' % (nom,ym,len(cen),', '.join('%.1f'%(c/sc) for c in cen)))
    if len(cen)>=8:
        for k in range(0,len(cen)-1,2):
            a,b=cen[k],cen[k+1]
            print('        rond %d : bords %.2f et %.2f -> D=%.2f CSS, centre %.2f CSS' % (k//2+1,a/sc,b/sc,(b-a)/sc,(a+b)/2/sc))
# indicateur d'onglet actif
print('   indicateur d\'onglet actif :')
for nom,path,y0,y1,sc in (('canon',CANON,1985,2000,SC_CANON),('jeu 2400',DIST,2308,2320,SC_CAPT),('jeu 1920',F1920,1828,1840,SC_CAPT)):
    im=ouvrir(path,nom); px=im.load(); W=im.size[0]
    pts=[(x,y) for y in range(y0,y1) for x in range(W) if dist_rgb(px[x,y],TOK['laiton'])<45 or dist_rgb(px[x,y],TOK['or'])<45]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        print('     %-9s : %d px ; x %.2f..%.2f (%.2f CSS) ; y %.2f..%.2f (%.2f CSS) ; centre x %.2f CSS ; couleur %s'
              % (nom,len(pts),min(xs)/sc,max(xs)/sc,(max(xs)-min(xs)+1)/sc,min(ys)/sc,max(ys)/sc,(max(ys)-min(ys)+1)/sc,
                 (min(xs)+max(xs))/2/sc, str(medrgb(px,min(xs)+2,min(ys),max(xs)-2,max(ys)+1))))
