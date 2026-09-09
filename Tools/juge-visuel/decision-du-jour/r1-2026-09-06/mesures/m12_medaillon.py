#!/usr/bin/env python3
"""m12 - MEDAILLON : detection par 'non-fond' dans une fenetre serree (le detecteur 'or' de m11
coupait le degrade bas du jeton : corrige). Puis profil radial = guillochage (piece) vs aplat.
Controle positif : dans la REF, le disque detecte doit etre QUASI CIRCULAIRE (|L-H| <= 3 px).
"""
from PIL import Image
import os, statistics, math
from collections import deque
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def disque(im,x0,x1,y0,y1,seuil,label):
    px=im.load(); xs=[];ys=[];n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if L(px[x,y])>seuil: xs.append(x);ys.append(y);n+=1
    if not xs: print(f"[{label}] rien"); return None
    bb=(min(xs),min(ys),max(xs),max(ys))
    Lw,Hh=bb[2]-bb[0]+1,bb[3]-bb[1]+1
    print(f"[{label}] seuil_lum>{seuil} bbox x={bb[0]}..{bb[2]} y={bb[1]}..{bb[3]}  L={Lw} H={Hh} "
          f"aire={n} remplissage={n/(Lw*Hh):.3f}  circulaire? |L-H|={abs(Lw-Hh)}")
    return bb,Lw,Hh

# fenetres larges autour du jeton, seuil bien au-dessus du fond
r=disque(ref,770,990,1180,1390,60,'REF')
c=disque(cap,820,1010,1410,1590,40,'CAP')
print(f"  CONTROLE POSITIF REF quasi-circulaire : |L-H|={abs(r[1]-r[2])} (attendu <=3) -> {'OK' if abs(r[1]-r[2])<=3 else 'ECHEC'}")
print(f"  -> diametre REF={r[1]}  CAP={c[1]}   rapport={c[1]/r[1]:.3f}   ecart={c[1]-r[1]:+d} px ({(c[1]-r[1])/r[1]*100:+.1f}%)")

def radial(im,bb,frac,label):
    px=im.load(); cx=(bb[0]+bb[2])//2; cy=(bb[1]+bb[3])//2; rad=int((bb[2]-bb[0]+1)*frac)
    vals=[]
    for k in range(720):
        a=k*math.pi/360.0
        x=int(cx+rad*math.cos(a)); y=int(cy+rad*math.sin(a))
        vals.append(L(px[x,y]))
    print(f"  {label} anneau r={rad} ({frac:.2f}xD) : min={min(vals):.0f} max={max(vals):.0f} "
          f"moy={statistics.mean(vals):.1f} ecart-type={statistics.pstdev(vals):.2f}")
    return statistics.pstdev(vals)
print("  -- guillochage : un jeton cranele fait varier la luminance le long de son bord ; un aplat non --")
sr=radial(ref,r[0],0.47,'[REF]'); sc=radial(cap,c[0],0.47,'[CAP]')
sr2=radial(ref,r[0],0.30,'[REF]'); sc2=radial(cap,c[0],0.30,'[CAP]')
print(f"  ecart-type interieur (0,30xD) REF={sr2:.2f} CAP={sc2:.2f}")
