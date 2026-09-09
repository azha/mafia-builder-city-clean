# m01 — structure verticale : bandeau, bande du nom de district, art, dock, gouttiere
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *

print('=== m01 structure verticale ===')

def profil(path, xs, nom, sc):
    im = ouvrir(path, nom); px = im.load(); W,H = im.size
    print('   colonnes echantillonnees:', xs)
    prev = None; ruptures = []
    for y in range(H):
        c = medrgb(px, xs[0], y, xs[0]+1, y+1)
        # mediane sur plusieurs colonnes
        vals = [px[x,y] for x in xs]
        r = med([v[0] for v in vals]); g = med([v[1] for v in vals]); b = med([v[2] for v in vals])
        cur = (r,g,b)
        if prev is not None and dist_rgb(cur, prev) > 6:
            ruptures.append((y, prev, cur))
        prev = cur
    return im, px, ruptures

# colonne loin des textes et du medaillon : x=1000..1010 (bord droit) et x=60..70
for path,nom in [(DIST,'district 2400'), (F1920,'fiche 1920'), (F2400,'fiche 2400')]:
    im = ouvrir(path, nom); px = im.load(); W,H = im.size
    sc = SC_CAPT
    print('  -- %s : bandes unies detectees sur la colonne x=1040..1050 --' % nom)
    xs = list(range(1040,1051))
    prev=None; y0=0
    seq=[]
    for y in range(H):
        vals=[px[x,y] for x in xs]
        cur=(med([v[0] for v in vals]), med([v[1] for v in vals]), med([v[2] for v in vals]))
        if prev is None: prev=cur; y0=y; continue
        if dist_rgb(cur,prev)>4:
            seq.append((y0,y-1,prev))
            y0=y
        prev=cur
    seq.append((y0,H-1,prev))
    for a,b,c in seq:
        if b-a >= 6:
            print('     y %4d..%4d (%6.2f..%6.2f CSS)  h=%4d  couleur=%s' % (a,b,a/sc,b/sc,b-a+1,c))
    print()
