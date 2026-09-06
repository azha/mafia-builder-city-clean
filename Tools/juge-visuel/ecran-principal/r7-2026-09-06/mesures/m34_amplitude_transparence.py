# -- m34 : amplitude VISIBLE de la transparence de la plaque, mesuree entre les deux captures 2400 (d24 sans fiche / c24 avec).
#    Population : pixels du fond de la plaque (pas d'encre : L(c24)<40 et L(d24) quelconque).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
s=sc('c24'); A=img('d24'); B=img('c24'); da=A.load(); db=B.load()
buckets={}
pts=[]
for yp in range(int(604*s),int(762*s)):
    for xp in range(int(17*s),int(376*s)):
        r=db[xp,yp]; b=da[xp,yp]
        if lum(r)<40 and max(r)<60: pts.append((lum(b),lum(r)))
pts.sort()
n=len(pts)
print("  n =",n)
for q in [0.02,0.10,0.25,0.50,0.75,0.90,0.98]:
    i=int(q*(n-1)); print("   fond (art) L=%6.1f  ⇒  plaque rendue L=%6.1f   [percentile %.0f %%]"%(pts[i][0],pts[i][1],100*q))
# moyenne de L(plaque) par decile de L(art)
import statistics
dec=[[] for _ in range(10)]
lo=pts[0][0]; hi=pts[-1][0]
for b,r in pts:
    k=min(9,int((b-lo)/(hi-lo+1e-9)*10)); dec[k].append(r)
print("  L(plaque) moyen par decile de L(art) :")
mo=[]
for k in range(10):
    if dec[k]:
        m=sum(dec[k])/len(dec[k]); mo.append(m)
        print("    decile %d (n=%6d) : %.2f"%(k,len(dec[k]),m))
print("  ⇒ AMPLITUDE de la transparence = %.2f L entre le decile d'art le plus sombre et le plus clair"%(max(mo)-min(mo)))
