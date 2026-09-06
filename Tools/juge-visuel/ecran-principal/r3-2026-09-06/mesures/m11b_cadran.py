# m11b — cadran : rayon borne a 28 CSS (exclut l'anneau, dont r_ext = 32.0 canon / 33.9 capture).
# Angle : 0 = droite, 90 = haut. Controle NEGATIF : a r>30 on doit retrouver l'anneau (verif imprimee).
import sys,math; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0,196.0,43.8),('district','../capture-district-1080x2400.png',2.755,196.0,35.0)]
for name,f,fac,cx,cy in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    print(f'== {name} {w}x{h}  moyeu=({cx},{cy}) CSS')
    T={};B={};W={}
    for adeg in range(0,360,2):
        a=math.radians(adeg)
        for rr in [x*0.25 for x in range(12,113)]:   # 3.0 .. 28.0 CSS
            X=int(round((cx+rr*math.cos(a))*fac)); Y=int(round((cy-rr*math.sin(a))*fac))
            if X<0 or Y<0 or X>=w or Y>=h: continue
            p=px[X,Y]
            if p[2]>p[0]+20 and p[1]>80: T.setdefault(adeg,[]).append((rr,p))
            elif p[0]>p[2]+40 and p[0]>110: B.setdefault(adeg,[]).append((rr,p))
            elif min(p)>150: W.setdefault(adeg,[]).append((rr,p))
    def rep(lbl,D):
        if not D: print(f'   {lbl}: rien'); return
        ks=sorted(D)
        ri=min(v[0] for k in ks for v in D[k]); re=max(v[0] for k in ks for v in D[k])
        km=ks[len(ks)//2]
        print(f'   {lbl}: angles {ks[0]}..{ks[-1]} deg, {len(ks)} pas ; r {ri:.2f}..{re:.2f} CSS ; couleur au milieu {D[km][len(D[km])//2][1]}')
    rep('teal  ',T); rep('braise',B); rep('blanc ',W)
    # controle negatif : l'anneau doit apparaitre a r=33
    a=math.radians(180); X=int(round((cx-33*math.cos(0))*fac)); Y=int(round(cy*fac))
    print(f'   [ctrl neg] pixel a r=33 CSS a gauche du moyeu : {px[int(round((cx-33)*fac)), int(round(cy*fac))]}')
