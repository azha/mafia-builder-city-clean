# -*- coding: utf-8 -*-
"""m03 - masques des arcs du cadran + ajustement du cercle de courbure.
CONTROLE POSITIF : sur le canon, le rayon ajuste doit valoir 26 unites viewBox x 0.7 = 18.20 CSS
(SVG 60x40 dans une boite 44x28 => preserveAspectRatio xMidYMid meet => echelle 0.700) et
l'epaisseur 3.5 x 0.7 = 2.45 CSS. Ces deux nombres viennent de la SOURCE, pas de l'image.
CONTROLE NEGATIF : le meme masque applique au disque du pivot (laiton) doit rendre 0 pixel teal."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *

ANC=json.load(open('ancres.json'))

def est_teal(c):
    r,g,b=c
    return (b-r)>=14 and (g-r)>=10 and g>=55
def est_braise(c):
    r,g,b=c
    return (r-b)>=26 and (r-g)>=16 and r>=85

def masque(cle, quoi, rmax=30.0):
    im,f=ouvrir(cle,taire=True); px=im.load(); W,H=im.size
    a=ANC[cle]; cx,cy=a['cx'],a['cy']
    pts=[]
    fn = est_teal if quoi=='teal' else est_braise
    for yy in range(max(0,int((cy-rmax)*f)), min(H,int((cy+rmax)*f)+1)):
        for xx in range(max(0,int((cx-rmax)*f)), min(W,int((cx+rmax)*f)+1)):
            X,Y=xx/f,yy/f
            if (X-cx)**2+(Y-cy)**2 > rmax*rmax: continue
            if fn(px[xx,yy]): pts.append((X,Y))
    return pts,(cx,cy)

def fit_cercle(pts):
    """Ajustement algebrique (Kasa) : minimise sum (r_i^2 - R^2)^2 -> centre de courbure."""
    n=len(pts)
    sx=sum(p[0] for p in pts); sy=sum(p[1] for p in pts)
    sxx=sum(p[0]*p[0] for p in pts); syy=sum(p[1]*p[1] for p in pts); sxy=sum(p[0]*p[1] for p in pts)
    sxxx=sum(p[0]**3 for p in pts); syyy=sum(p[1]**3 for p in pts)
    sxyy=sum(p[0]*p[1]*p[1] for p in pts); sxxy=sum(p[0]*p[0]*p[1] for p in pts)
    A=n*sxx-sx*sx; B=n*sxy-sx*sy; C=n*syy-sy*sy
    Dd=0.5*(n*sxyy-sx*syy+n*sxxx-sx*sxx)
    E=0.5*(n*sxxy-sy*sxx+n*syyy-sy*syy)
    den=A*C-B*B
    if abs(den)<1e-9: return None
    cx=(Dd*C-B*E)/den; cy=(A*E-B*Dd)/den
    R=mediane([math.hypot(p[0]-cx,p[1]-cy) for p in pts])
    return cx,cy,R

print("=== m03 : masques des arcs et cercle de courbure ===")
out={}
for cle in ['canon','j1920','j2400']:
    ouvrir(cle)
    t,(mcx,mcy)=masque(cle,'teal'); b,_=masque(cle,'braise')
    print("\n-- %s  (centre du boitier %.2f ; %.2f)"%(cle,mcx,mcy))
    print("   pixels teal=%d  braise=%d"%(len(t),len(b)))
    ft=fit_cercle(t); fb=fit_cercle(b); fa=fit_cercle(t+b)
    for nom,ff in [('teal seul',ft),('braise seul',fb),('les DEUX',fa)]:
        print("   fit %-12s centre (%.2f ; %.2f) CSS  R median %.3f CSS   (offset / centre boitier : %+.2f ; %+.2f)"
              %(nom,ff[0],ff[1],ff[2],ff[0]-mcx,ff[1]-mcy))
    out[cle]=dict(mcx=mcx,mcy=mcy,acx=fa[0],acy=fa[1],aR=fa[2],
                  tcx=ft[0],tcy=ft[1],tR=ft[2],bcx=fb[0],bcy=fb[1],bR=fb[2])
json.dump(out,open('arcs.json','w'),indent=1)
# controle negatif : le pivot (laiton) ne doit rendre aucun pixel teal
print("\n[controle negatif] pixels teal dans le disque du pivot (r<3 CSS autour du pivot) :")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle,taire=True); px=im.load()
    a=ANC[cle]
    n=0
    for yy in range(int((a['cy']-2)*f),int((a['cy']+8)*f)):
        for xx in range(int((a['cx']-4)*f),int((a['cx']+4)*f)):
            if est_teal(px[xx,yy]): n+=1
    print("   %-6s : %d"%(cle,n))
print("\n[controle positif] canon attendu par la SOURCE : R=18.20 CSS, epaisseur 2.45 CSS")
