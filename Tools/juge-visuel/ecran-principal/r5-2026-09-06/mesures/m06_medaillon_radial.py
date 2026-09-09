# Grandeur : centre, rayon EXTERIEUR de l'anneau, epaisseur de l'anneau (2 conventions),
#            rayon MEDIAN de l'arc, epaisseur radiale de l'arc, longueur d'aiguille / R, rayon de la pointe.
# Methode : centroïde de l'anneau puis profil radial le long de rayons choisis.
# Controle positif : sur la REFERENCE le diametre exterieur doit rendre 64,00 CSS (mesure-canon .medaillon 64).
from common import *
import math
def satur(c):
    mx=max(c); return 0 if mx==0 else (mx-min(c))/mx
def anneau_px(im,box,pred):
    px=im.load(); pts=[]
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            if pred(px[x,y]): pts.append((x,y))
    return pts
def centre_rayon(pts,label,scale):
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    cx=(min(xs)+max(xs))/2.0; cy=(min(ys)+max(ys))/2.0
    dx=(max(xs)-min(xs)+1); dy=(max(ys)-min(ys)+1)
    print(f'  {label}: n={len(pts)}  bbox x {min(xs)}..{max(xs)} ({dx} px) y {min(ys)}..{max(ys)} ({dy} px)')
    print(f'    centre=({cx:.1f},{cy:.1f}) px = ({cx/scale:.2f},{cy/scale:.2f}) CSS ; diam ext = {dx} x {dy} px = {dx/scale:.2f} x {dy/scale:.2f} CSS')
    return cx,cy,(dx+dy)/4.0
def profil_radial(im,cx,cy,ang_deg,rmax,scale,label,pas=0.25):
    px=im.load(); a=math.radians(ang_deg); out=[]
    r=0.0
    while r<rmax:
        x=cx+r*math.sin(a); y=cy-r*math.cos(a)
        if 0<=int(round(x))<im.width and 0<=int(round(y))<im.height:
            out.append((r,px[int(round(x)),int(round(y))]))
        r+=pas
    return out
print('=== REFERENCE ===')
r=op(REF)
pts=anneau_px(r,(470,10,710,250),lambda c: c[0]>150 and c[0]-c[2]>60 and c[1]>c[2] and satur(c)>0.4)
rcx,rcy,rR=centre_rayon(pts,'REF anneau or',REF_S)
print(f'    CONTROLE POSITIF diam ext ref = {2*rR/REF_S:.2f} CSS (attendu 64,00 de mesure-canon) ecart {2*rR/REF_S-64:.2f}')
print('=== CAPTURE 2400 district ===')
c=op(C24)
pts2=anneau_px(c,(440,10,660,260),lambda c2: c2[0]>140 and c2[0]-c2[2]>55 and c2[1]>c2[2] and satur(c2)>0.4)
ccx,ccy,cR=centre_rayon(pts2,'CAP anneau orange',CAP_S)
print('=== CAPTURE 1920 fiche ===')
c19=op(C19)
pts3=anneau_px(c19,(440,10,660,260),lambda c2: c2[0]>140 and c2[0]-c2[2]>55 and c2[1]>c2[2] and satur(c2)>0.4)
c19cx,c19cy,c19R=centre_rayon(pts3,'CAP1920 anneau orange',CAP_S)
print()
print('--- profils radiaux a 180 deg (vers le BAS, hors texte ? non) et a 270 (vers la GAUCHE) ---')
for nom,im,cx,cy,sc,rmax in [('REF',r,rcx,rcy,REF_S,120),('CAP2400',c,ccx,ccy,CAP_S,150)]:
    for ang in (270,90):
        p=profil_radial(im,cx,cy,ang,rmax,sc)
        print(f'  {nom} angle {ang}:')
        prev=None
        for rr,cc in p:
            L=lum(cc)
            if prev is None or abs(L-prev)>8:
                print(f'     r={rr:6.2f} px ({rr/sc:6.2f} CSS)  {cc} L={L:.0f}')
            prev=L
