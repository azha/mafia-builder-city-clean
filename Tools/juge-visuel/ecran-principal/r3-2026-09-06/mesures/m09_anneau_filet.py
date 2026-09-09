# m09 — (a) cercle de l'anneau par balayage de lignes ; (b) le filet laiton traverse-t-il le medaillon ?
# Controle positif : le centre trouve doit valoir 196 CSS sur les deux images (mesure-canon : 164+32).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac))
    print(f'== {name} {w}x{h}')
    pts=[]
    for ycss in [x*0.5 for x in range(10,180)]:
        y=C(ycss)
        if y>=h: break
        seg=[];cur=None
        for x in range(C(150),C(245)):
            p=px[x,y]; hit=(p[0]-p[2])>35 and p[0]>85
            if hit:
                if cur is None: cur=[x,x]
                else: cur[1]=x
            else:
                if cur: seg.append(cur); cur=None
        if cur: seg.append(cur)
        if len(seg)==2 and (seg[0][1]-seg[0][0])<C(6) and (seg[1][1]-seg[1][0])<C(6):
            pts.append((ycss, seg[0][0]/fac, seg[1][1]/fac))
    if pts:
        ytop=pts[0][0]; ybot=pts[-1][0]
        wid=max(p[2]-p[1] for p in pts)
        pm=[p for p in pts if (p[2]-p[1])==wid][0]
        print(f'   anneau (2 segments) de y={ytop:.1f} a y={ybot:.1f} CSS ; largeur max={wid:.2f} CSS a y={pm[0]:.1f} ; centre x={(pm[1]+pm[2])/2:.2f}')
        print(f'   -> diametre horizontal max {wid:.2f} CSS ; etendue verticale mesuree {ybot-ytop:.1f} CSS')
    # (b) le filet traverse-t-il ?
    yf = 51.3 if name=='canon' else 50.8
    y=C(yf)
    print(f'   filet y={yf} CSS -> echantillons (CSS x : rgb)')
    for xc in [150,158,163,170,180,196,212,222,228,232,240]:
        print(f'      x={xc:4d} : {median_win(px,C(xc),y,1)}')
