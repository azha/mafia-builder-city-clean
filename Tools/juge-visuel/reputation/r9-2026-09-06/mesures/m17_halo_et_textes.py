# -*- coding: utf-8 -*-
"""m17 — (a) le HALO de la pastille allumee (box-shadow 0 0 7px #f2c96b99) : profil radial
sur la capture ET sur le temoin #119 (x3,0), en ECART au fond de la tuile.
(b) textes restants (prt i, prt b, verdict span, pann small) avec des fenetres bornees par
les reperes mesures (m02/m03/m04), jamais devinees.
Contrôle positif (a) : au rayon 0 (centre de la pastille) l'ecart doit etre maximal des deux
  cotes — sinon la sonde ne vise pas la pastille.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
E=Image.open(os.path.join(D,'etats','m-119.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d  #119 %dx%d'%(R.size+C.size+E.size))
import math
def anneau(im,cx,cy,r,fond):
    px=im.load();s=0;n=0
    for a in range(0,360,3):
        x=int(round(cx+r*math.cos(math.radians(a))));y=int(round(cy+r*math.sin(math.radians(a))))
        c=px[x,y]; s+=max(c[i]-fond[i] for i in range(3)); n+=1
    return s/n
print('(a) HALO — ecart moyen au fond de tuile, par rayon')
# capture : pastille ON centre (573.5, 812.5), rayon 12 ; fond de tuile #16161c
for r in (0,10,14,18,22,26,34):
    print('   CAP  r=%2d px (%.1f CSS) : ecart moyen %+.1f'%(r,r/3.6,anneau(C,574,813,max(r,1),(0x16,0x16,0x1c))))
# temoin 119 : tuile ON y=803..886 ; pastille : on la localise
def loc(im,box,cible,tol):
    px=im.load();x0,y0,x1,y1=box;xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if all(abs(c[k]-cible[k])<=tol for k in range(3)): xs.append(x);ys.append(y)
    return (sum(xs)/len(xs),sum(ys)/len(ys),max(xs)-min(xs)+1) if xs else None
p=loc(E,(470,805,540,885),(0xf2,0xc9,0x6b),50)
print('   #119 pastille ON centre=(%.0f,%.0f) diam=%d px (%.2f CSS a x3)'%(p[0],p[1],p[2],p[2]/3.0))
for r in (0,8,12,15,18,22,28):
    print('   #119 r=%2d px (%.1f CSS) : ecart moyen %+.1f'%(r,r/3.0,anneau(E,int(p[0]),int(p[1]),max(r,1),(0x16,0x19,0x1b))))
print()
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def mesure(im,box,seuil):
    px=im.load();x0,y0,x1,y1=box;pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if lum(c)>=seuil: pts.append((x,y,c))
    if not pts: return None
    xs=[p[0] for p in pts];ys=[p[1] for p in pts]
    pts.sort(key=lambda p:-lum(p[2]));top=pts[:max(1,len(pts)//7)]
    med=tuple(sorted(t[2][k] for t in top)[len(top)//2] for k in range(3))
    return dict(x0=min(xs),x1=max(xs),y0=min(ys),y1=max(ys),w=max(xs)-min(xs)+1,h=max(ys)-min(ys)+1,col=med)
def duo(nom,bR,bC,s=95):
    a=mesure(R,bR,s);b=mesure(C,bC,s)
    if not a or not b: print('%-26s REF=%s CAP=%s'%(nom,a,b));return
    print('%-26s h %3d/%3d px | w %4d/%4d | y REF %d..%d CAP %d..%d | x %d..%d / %d..%d | centre REF %.1f CAP %.1f'
          %(nom,a['h'],b['h'],a['w'],b['w'],a['y0'],a['y1'],b['y0'],b['y1'],a['x0'],a['x1'],b['x0'],b['x1'],
            (a['x0']+a['x1'])/2,(b['x0']+b['x1'])/2))
print('(b) textes — fenetres bornees par la carte .prt (REF x82..505 / CAP x72..496)')
duo('prt i (2 lignes)',(84,890,504,965),(74,680,495,755),70)
duo('prt b "Il vous ecoute"',(84,1420,504,1475),(74,1180,495,1250),95)
duo('verdict span (multi-l.)',(760,880,1000,975),(755,655,1010,750),70)
duo('pann small (3 lignes)',(84,1770,1015,1900),(74,1580,1020,1710),70)
