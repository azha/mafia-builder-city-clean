# m12 — bbox de l'encre TEAL et de l'encre BRAISE a l'interieur du medaillon (disque r<=29 CSS
# autour du centre du boitier), + epaisseur du trait mesuree sur la ligne horizontale du sommet teal.
# Controle positif : le centre du boitier vaut (196, 39.0) canon / (196, 40.1) capture (m10).
import sys,math; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0,196.0,39.0,29.0),('district','../capture-district-1080x2400.png',2.755,196.0,40.1,30.0)]
for name,f,fac,cx,cy,rmax in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    print(f'== {name} {w}x{h} centre boitier=({cx},{cy}) rmax={rmax} CSS')
    T=[];B=[]
    for Y in range(int((cy-rmax)*fac),int((cy+rmax)*fac)+1):
        for X in range(int((cx-rmax)*fac),int((cx+rmax)*fac)+1):
            if X<0 or Y<0 or X>=w or Y>=h: continue
            if ((X/fac-cx)**2+(Y/fac-cy)**2)**0.5>rmax: continue
            p=px[X,Y]
            if p[2]>p[0]+20 and p[1]>80: T.append((X/fac,Y/fac,p))
            elif p[0]>p[2]+40 and p[0]>110 and p[1]<p[0]-30: B.append((X/fac,Y/fac,p))
    for lbl,L in (('teal',T),('braise',B)):
        if not L: print(f'   {lbl}: rien'); continue
        xs=[a for a,b,c in L]; ys=[b for a,b,c in L]
        R=sorted([c[0] for a,b,c in L]); G=sorted([c[1] for a,b,c in L]); Bl=sorted([c[2] for a,b,c in L])
        n=len(L)
        print(f'   {lbl}: n={n} px ; bbox x {min(xs):.1f}..{max(xs):.1f} y {min(ys):.1f}..{max(ys):.1f} CSS (l={max(xs)-min(xs):.1f} h={max(ys)-min(ys):.1f}) ; couleur mediane ({R[n//2]},{G[n//2]},{Bl[n//2]})')
        # epaisseur : sur la colonne x du barycentre teal, longueur du run
        xb=sum(xs)/len(xs)
        col=[b for a,b,c in L if abs(a-xb)<0.4]
        if col: print(f'      epaisseur radiale a x={xb:.1f} : {max(col)-min(col):.2f} CSS')
    print(f'   aire disque = {math.pi*rmax*rmax:.0f} CSS^2')
