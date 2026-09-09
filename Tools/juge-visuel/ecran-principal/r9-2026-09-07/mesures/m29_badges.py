# m29 — detection des marqueurs de batiment (anneau or sur disque sombre) dans la vue district.
# Controle positif : le badge "Laboratoire" est a ~ (520,795) px sur la planche 2400 -> doit etre trouve.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m29 detection des marqueurs de batiment ===')
def orb(c):
    r,g,b=c
    return r>150 and g>110 and b<150 and r-b>60 and g-b>30 and r>=g

for path,nom,Y0,Y1 in [(DIST,'district2400',240,2160),(F2400,'fiche2400',240,2160),(F1920,'fiche1920',0,1920)]:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    S=set()
    for y in range(Y0,Y1):
        for x in range(W):
            if orb(px[x,y]): S.add((x,y))
    vus=set(); comps=[]
    for p in S:
        if p in vus: continue
        pile=[p]; vus.add(p); c=[]
        while pile:
            q=pile.pop(); c.append(q)
            for d in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                n=(q[0]+d[0],q[1]+d[1])
                if n in S and n not in vus: vus.add(n); pile.append(n)
        comps.append(c)
    # un marqueur = composante annulaire : bbox ~ carree, 20..60 px, aire << bbox
    marq=[]
    for c in comps:
        xs=[p[0] for p in c]; ys=[p[1] for p in c]
        w=max(xs)-min(xs)+1; h=max(ys)-min(ys)+1
        if len(c)<40: continue
        if not(14<=w<=70 and 14<=h<=70): continue
        if abs(w-h)>max(6,0.35*max(w,h)): continue
        rem = len(c)/float(w*h)
        marq.append((min(xs)+w/2.0, min(ys)+h/2.0, w, h, len(c), rem))
    marq.sort(key=lambda m:(m[1],m[0]))
    print('   [%s] %d composantes or, %d marqueurs retenus' % (nom,len(comps),len(marq)))
    for i,(cx,cy,w,h,n,rem) in enumerate(marq):
        print('      M%02d centre (%7.1f,%7.1f) px  bbox %2dx%2d  %4d px  remplissage %.2f   [art-relatif y=%7.1f]'
              % (i+1,cx,cy,w,h,n,rem, cy-Y0))
    print()
