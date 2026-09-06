# -- m04 : boitier du medaillon, filet EXCLU. Controle positif : le canon doit rendre 64 CSS de diametre nominal.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

FILET = {'ref':(152.5,156.5), 'c19':(140.5,143.5), 'c24':(140.5,143.5), 'd24':(140.5,143.5)}

def ring(key, target, tol, box_css=(150,0,246,82)):
    s=sc(key); im=img(key); d=im.load()
    f0,f1=FILET[key]
    xs=[];ys=[];pts=[]
    for yp in range(int(box_css[1]*s), int(box_css[3]*s)):
        if f0<=yp<=f1: continue
        for xp in range(int(box_css[0]*s), int(box_css[2]*s)):
            p=d[xp,yp]
            if all(abs(p[c]-target[c])<=tol for c in range(3)):
                xs.append(xp/s); ys.append(yp/s); pts.append((xp/s,yp/s))
    if not pts: return None,None
    return dict(n=len(pts), x0=min(xs),x1=max(xs),y0=min(ys),y1=max(ys),
                cx=(min(xs)+max(xs))/2, cy=(min(ys)+max(ys))/2,
                w=max(xs)-min(xs), h=max(ys)-min(ys)), pts

def show(lbl,r):
    if r is None: print("  %s : AUCUN"%lbl); return
    print("  %-26s n=%5d  bbox x %.2f..%.2f  y %.2f..%.2f  ⇒ W=%.2f H=%.2f  centre (%.2f , %.2f)"
          %(lbl,r['n'],r['x0'],r['x1'],r['y0'],r['y1'],r['w'],r['h'],r['cx'],r['cy']))

print("=== CONTROLE POSITIF : canon, cerclage LAITON — attendu W=H~64 CSS, centre (196,40) ===")
r,_=ring('ref',(176,141,62),26); show("canon laiton",r)
print()
print("=== CAPTURES : cerclage BRAISE (etat brulant) ===")
for k in ['c19','c24','d24']:
    r,_=ring(k,(224,102,74),30); show(k+" braise",r)
print()
print("=== CONTROLE NEGATIF : laiton strict dans les captures (ne doit PAS dessiner un anneau) ===")
for k in ['c19','c24']:
    r,_=ring(k,(176,141,62),12); show(k+" laiton",r)
