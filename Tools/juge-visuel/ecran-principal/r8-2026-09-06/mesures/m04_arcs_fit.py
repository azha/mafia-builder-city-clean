# -*- coding: utf-8 -*-
"""m04 - centre de courbure des arcs par RECHERCHE SUR GRILLE (minimise l'ecart interquartile
des rayons). Robuste sur des arcs courts, la ou l'ajustement algebrique diverge.
Sort aussi les masques en image pour prouver qu'ils attrapent l'arc et rien d'autre."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
from PIL import Image

ANC=json.load(open('ancres.json'))
def est_teal(c):
    r,g,b=c
    return (b-r)>=14 and (g-r)>=10 and g>=55
def est_braise(c):
    r,g,b=c
    return (r-b)>=26 and (r-g)>=16 and r>=85

def pts(cle, quoi, rmax=30.0):
    im,f=ouvrir(cle,taire=True); px=im.load(); W,H=im.size
    a=ANC[cle]; cx,cy=a['cx'],a['cy']
    fn = est_teal if quoi=='teal' else est_braise
    out=[]
    for yy in range(max(0,int((cy-rmax)*f)), min(H,int((cy+rmax)*f)+1)):
        for xx in range(max(0,int((cx-rmax)*f)), min(W,int((cx+rmax)*f)+1)):
            X,Y=xx/f,yy/f
            if (X-cx)**2+(Y-cy)**2 > rmax*rmax: continue
            if fn(px[xx,yy]): out.append((X,Y))
    return out,(cx,cy)

def iqr_rayons(P,cx,cy):
    r=sorted(math.hypot(p[0]-cx,p[1]-cy) for p in P)
    n=len(r)
    return r[int(.75*n)]-r[int(.25*n)], mediane(r)

def grille(P,cx0,cy0,span=14.0,pas=0.5):
    best=None
    k=int(span/pas)
    for i in range(-k,k+1):
        for j in range(-k,k+1):
            cx,cy=cx0+i*pas,cy0+j*pas
            q,R=iqr_rayons(P,cx,cy)
            if best is None or q<best[0]: best=(q,cx,cy,R)
    # affinage
    q,cx0,cy0,R=best; best=None
    for i in range(-10,11):
        for j in range(-10,11):
            cx,cy=cx0+i*0.05,cy0+j*0.05
            q,R=iqr_rayons(P,cx,cy)
            if best is None or q<best[0]: best=(q,cx,cy,R)
    return best

print("=== m04 : centre de courbure des arcs (grille, IQR minimal) ===")
res={}
for cle in ['canon','j1920','j2400']:
    ouvrir(cle)
    T,(mcx,mcy)=pts(cle,'teal'); B,_=pts(cle,'braise')
    print("\n-- %s  centre boitier (%.2f ; %.2f)  |teal|=%d |braise|=%d"%(cle,mcx,mcy,len(T),len(B)))
    for nom,P in [('teal',T),('braise',B),('teal+braise',T+B)]:
        q,cx,cy,R=grille(P,mcx,mcy)
        print("   %-12s : centre (%7.2f ; %7.2f)  R median %6.3f CSS  IQR(r) %5.3f  offset/boitier (%+.2f ; %+.2f)"
              %(nom,cx,cy,R,q,cx-mcx,cy-mcy))
        if nom=='teal+braise': res[cle]=dict(cx=cx,cy=cy,R=R,iqr=q,mcx=mcx,mcy=mcy)
    # image du masque
    im,f=ouvrir(cle,taire=True)
    a=ANC[cle]
    box=(int((a['cx']-30)*f),int((a['cy']-30)*f),int((a['cx']+30)*f),int((a['cy']+30)*f))
    sub=im.crop(box).convert('RGB'); w,h=sub.size
    vis=Image.new('RGB',(w,h),(0,0,0)); vp=vis.load(); sp=sub.load()
    for y in range(h):
        for x in range(w):
            c=sp[x,y]
            if est_teal(c): vp[x,y]=(0,255,255)
            elif est_braise(c): vp[x,y]=(255,0,0)
    vis.resize((360,360),Image.NEAREST).save('z_masque_%s.png'%cle)
json.dump(res,open('arcs.json','w'),indent=1)
print("\n[controle positif] canon attendu par la SOURCE (hud-brennar.html) :")
print("   viewBox 60x40 dans une boite 44x28 -> echelle 0.700 ; arcs A 26 26 -> R = 18.20 CSS ;")
print("   centre de courbure a (30 ; 47.856) viewBox, pivot a (30 ; 34) -> le centre des arcs est")
print("   13.856 unites (= 9.70 CSS) SOUS le pivot.")
