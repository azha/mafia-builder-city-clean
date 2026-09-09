import sys; sys.path.insert(0,'.')
from lib import *

def lignes(im, x0,y0,x1,y1, marge=14):
    """detecte les lignes de texte : rangees dont l'encre depasse le fond local"""
    p = px(im)
    prof=[]
    for y in range(y0,y1):
        vals = sorted(lum(p[x,y]) for x in range(x0,x1))
        fond = vals[len(vals)//4]
        n = sum(1 for x in range(x0,x1) if lum(p[x,y])-fond > marge)
        prof.append(n)
    out=[]; cur=None
    for i,n in enumerate(prof):
        if n>=3:
            if cur is None: cur=[i,i]
            else: cur[1]=i
        else:
            if cur is not None and cur[1]-cur[0]>=3: out.append((y0+cur[0], y0+cur[1]))
            cur=None
    if cur is not None and cur[1]-cur[0]>=3: out.append((y0+cur[0], y0+cur[1]))
    # bbox horizontale de chaque ligne
    res=[]
    for a,b in out:
        xs=[x for y in range(a,b+1) for x in range(x0,x1)
            if lum(p[x,y]) - sorted(lum(p[xx,y]) for xx in range(x0,x1))[ (x1-x0)//4 ] > marge]
        if xs: res.append((a,b,b-a+1,min(xs),max(xs),max(xs)-min(xs)+1))
    return res

BLOCS = {
 'enseigne'   : ((60,1020), 'REF', 481, 663, 'C24', 513, 687),
 'compteurs'  : ((60,1020), 'REF', 703, 813, 'C24', 729, 839),
 'elast'      : ((520,1020),'REF', 850, 1611,'C24', 876, 1655),
 'carte'      : ((90,500),  'REF', 850, 1611,'C24', 876, 1655),
 'panneaubas' : ((70,1000), 'REF', 1647,1918,'C24', 1692,1954),
}
ref = ouvrir('../reference-1080x2102.png')
cap = ouvrir('../capture-1080x2400.png')
for nom,((x0,x1), _, ry0, ry1, _, cy0, cy1) in BLOCS.items():
    print(f"--- {nom} ---")
    lr = lignes(ref, x0,ry0,x1,ry1)
    lc = lignes(cap, x0,cy0,x1,cy1)
    print("  REF :")
    for a,b,h,xa,xb,w in lr: print(f"     y {a}..{b} (h={h:3d}) x {xa}..{xb} (l={w:4d})   rel={a-452}")
    print("  JEU :")
    for a,b,h,xa,xb,w in lc: print(f"     y {a}..{b} (h={h:3d}) x {xa}..{xb} (l={w:4d})   rel={a-482}")
