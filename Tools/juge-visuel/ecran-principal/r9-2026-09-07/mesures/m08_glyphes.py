# m08 — segmentation des glyphes du montant : hauteur de capitale reelle par glyphe
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m08 glyphes du montant (segmentation par colonnes vides) ===')
def orvif(c):
    r,g,b=c; return r>140 and g>100 and b<170 and r-b>50 and r>=g-6

CFG=[(CANON,'canon  "$ 24 850"',SC_CANON,(30,500),(58,110)),
     (DIST,'jeu    "9 627 820,00 EUR"',SC_CAPT,(150,450),(66,106))]
for path,nom,sc,(x0,x1),(y0,y1) in CFG:
    im=ouvrir(path,nom); px=im.load()
    cols={}
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if orvif(px[x,y])]
        if ys: cols[x]=(min(ys),max(ys))
    xs=sorted(cols)
    groupes=[]; cur=[xs[0]]
    for x in xs[1:]:
        if x-cur[-1] <= 1: cur.append(x)
        else: groupes.append(cur); cur=[x]
    groupes.append(cur)
    print('   [%s] %d glyphes' % (nom,len(groupes)))
    for g in groupes:
        t=min(cols[x][0] for x in g); b=max(cols[x][1] for x in g)
        print('      x %6.2f..%6.2f CSS  larg %5.2f  y %6.2f..%6.2f  haut %5.2f CSS'
              % (g[0]/sc,g[-1]/sc,(g[-1]-g[0]+1)/sc, t/sc, b/sc, (b-t+1)/sc))
    print()
