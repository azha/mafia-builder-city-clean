# m22 : la bande entre l'inset du chrome et le cadre est-elle VIDE ? + hauteurs des blocs.
import sys; sys.path.insert(0,'.')
from lib import *
im=ouvrir('capture-1080x2400.png'); px=im.load()
print("   balayage y=232..481, x=24..1056 : rangees portant de l'encre (ecart > 6 a la mediane)")
n=0
for y in range(232,482):
    row=[lum(px[x,y]) for x in range(24,1056)]
    m=mediane(row)
    k=sum(1 for v in row if abs(v-m)>6)
    if k>4: print("      y=%d : %d colonnes" % (y,k)); n+=1
print("   -> %d rangees encrees sur 250 ; luminance mediane de la bande = %.1f ; couleur = %s"
      % (n, mediane([lum(px[x,y]) for y in range(240,470,7) for x in range(30,1050,7)]), mediane_fenetre(px,540,350,6)))

print("\n### hauteurs des blocs (frontieres du m21) ###")
BLOCS = {
 'ref'  : dict(cadre=(452,2079), titre=(481,670), compteurs=(702,816), elast=(848,1614), carte=(877,1533), bas=(1647,1920), cta=(1952,2047)),
 '2400' : dict(cadre=(482,2110), titre=(511,694), compteurs=(727,842), elast=(874,1551), carte=(903,1561), bas=(1584,1850), cta=(1882,1971)),
 '1920' : dict(cadre=(250,1630), titre=(278,462), compteurs=(494,610), elast=(642,1319), carte=(671,1328), bas=(1351,1618), cta=None),
}
noms=['cadre','titre','compteurs','elast','carte','bas','cta']
print("   %-11s %10s %10s %10s   %8s %8s" % ('bloc','ref (px)','2400','1920','D 2400','D 1920'))
for b in noms:
    r=BLOCS['ref'][b]; a=BLOCS['2400'][b]; c=BLOCS['1920'][b]
    hr=r[1]-r[0]+1
    ha=(a[1]-a[0]+1) if a else None
    hc=(c[1]-c[0]+1) if c else None
    print("   %-11s %10d %10s %10s   %8s %8s" % (b,hr,ha if ha else 'ABSENT',hc if hc else 'ABSENT',
        ("%+.1f%%"%(100.0*(ha-hr)/hr)) if ha else '-', ("%+.1f%%"%(100.0*(hc-hr)/hr)) if hc else '-'))
print()
print("   debord de la carte portrait SOUS le panneau elastique :")
for k in ('ref','2400','1920'):
    e=BLOCS[k]['elast']; c=BLOCS[k]['carte']
    print("      %-5s bas carte=%d  bas panneau=%d  ->  %+d px" % (k,c[1],e[1],c[1]-e[1]))
