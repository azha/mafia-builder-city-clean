# m14 : barycentre du halo EXTERIEUR (d<=6, hors trous, hors bande du libelle) + ecart chiffre->libelle.
import sys; sys.path.insert(0,'.')
from lib import *
CYAN=(127,212,217)
def est_cyan(c,tol=28): return abs(c[0]-CYAN[0])<=tol and abs(c[1]-CYAN[1])<=tol and abs(c[2]-CYAN[2])<=tol

def bary(nom,bx0,bx1,dy0,dy1,dmax,etiq):
    im=ouvrir(nom); px=im.load(); W=bx1-bx0+1; H=dy1-dy0+1
    ink=[[est_cyan(px[bx0+x,dy0+y]) for x in range(W)] for y in range(H)]
    ext=[[False]*W for _ in range(H)]; pile=[]
    for x in range(W):
        for y in (0,H-1):
            if not ink[y][x] and not ext[y][x]: ext[y][x]=True; pile.append((x,y))
    for y in range(H):
        for x in (0,W-1):
            if not ink[y][x] and not ext[y][x]: ext[y][x]=True; pile.append((x,y))
    while pile:
        x,y=pile.pop()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            i,j=x+dx,y+dy
            if 0<=i<W and 0<=j<H and not ink[j][i] and not ext[j][i]: ext[j][i]=True; pile.append((i,j))
    INF=10**6
    d=[[0 if ink[y][x] else INF for x in range(W)] for y in range(H)]
    for y in range(H):
        for x in range(W):
            if d[y][x]==0: continue
            m=INF
            for dy,dx in ((-1,-1),(-1,0),(-1,1),(0,-1)):
                j,i=y+dy,x+dx
                if 0<=j<H and 0<=i<W and d[j][i]+1<m: m=d[j][i]+1
            d[y][x]=min(d[y][x],m)
    for y in range(H-1,-1,-1):
        for x in range(W-1,-1,-1):
            if d[y][x]==0: continue
            m=d[y][x]
            for dy,dx in ((1,1),(1,0),(1,-1),(0,1)):
                j,i=y+dy,x+dx
                if 0<=j<H and 0<=i<W and d[j][i]+1<m: m=d[j][i]+1
            d[y][x]=m
    fond={y: mediane([lum(px[x,y]) for x in range(bx0,bx1+1)]) for y in range(dy0,dy1+1)}
    sx=sy=sw=0.0
    for y in range(H):
        for x in range(W):
            if ext[y][x] and 1<=d[y][x]<=dmax:
                e=lum(px[bx0+x,dy0+y])-fond[dy0+y]
                if e>0: sx+=e*x; sy+=e*y; sw+=e
    ix=sum(x for y in range(H) for x in range(W) if ink[y][x]); iy=sum(y for y in range(H) for x in range(W) if ink[y][x])
    n=sum(1 for y in range(H) for x in range(W) if ink[y][x])
    print("  == %s == barycentre halo(ext, d<=%d) − encre = (%+.2f ; %+.2f) px ; masse=%.0f pts"
          % (etiq,dmax, sx/sw-ix/n, sy/sw-iy/n, sw))
    # symetrie exterieure haut/bas
    cols=[x for x in range(W) if any(ink[y][x] for y in range(H))]
    y0=min(y for y in range(H) if any(ink[y][x] for x in range(W))); y1=max(y for y in range(H) if any(ink[y][x] for x in range(W)))
    h=sum(max(0.0,lum(px[bx0+x,dy0+y])-fond[dy0+y]) for y in range(max(0,y0-dmax),y0) for x in cols)
    b=sum(max(0.0,lum(px[bx0+x,dy0+y])-fond[dy0+y]) for y in range(y1+1,min(H,y1+dmax+1)) for x in cols)
    print("     symetrie exterieure haut/bas sur %d rangees = %.0f / %.0f -> %s" % (dmax,h,b,("%.2f"%(h/b)) if b else "n/a"))

bary('reference-1080x2102.png',56,356,706,781,6,'ref c1')
bary('capture-1080x2400.png',52,354,731,805,6,'jeu2400 c1')
bary('capture-1080x1920.png',52,354,499,573,6,'jeu1920 c1')

print("\n--- ecart chiffre -> libelle (bas de l'encre du chiffre -> haut de l'encre du libelle) ---")
def ecart(nom,bx0,bx1,ya,yb,etiq):
    im=Image.open(DOSSIER+'/'+nom).convert('RGB'); px=im.load()
    bas=None; haut=None
    for y in range(ya,yb):
        if any(est_cyan(px[x,y]) for x in range(bx0,bx1+1)): bas=y
    fondloc=mediane([lum(px[x,yb-2]) for x in range(bx0,bx1+1)])
    for y in range(bas+1,yb):
        row=[lum(px[x,y]) for x in range(bx0,bx1+1)]
        m=mediane(row)
        if sum(1 for v in row if v-m>25)>=4: haut=y; break
    print("   %-12s bas de l'encre du chiffre y=%s ; haut de l'encre du libelle y=%s ; ECART=%s px" % (etiq,bas,haut, (haut-bas-1) if haut else '?'))
ecart('reference-1080x2102.png',56,356,700,812,'ref c1')
ecart('capture-1080x2400.png',52,354,731,837,'jeu2400 c1')
ecart('capture-1080x1920.png',52,354,499,605,'jeu1920 c1')
