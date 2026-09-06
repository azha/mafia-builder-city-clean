#!/usr/bin/env python3
"""m12c - MEDAILLON : diametre par la LIGNE LA PLUS LARGE du disque (insensible au chiffre sombre
au centre, qui avait fait echouer le balayage en croix de m12b).
Controle positif : |D_horiz - D_vert| <= 4 px des deux cotes (un disque est circulaire).
"""
from PIL import Image
import os, statistics, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def disque(im,x0,x1,y0,y1,seuil,label):
    px=im.load()
    best=None
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if L(px[x,y])>seuil]
        if xs and (best is None or (max(xs)-min(xs))>best[1]):
            best=(y,max(xs)-min(xs)+1,min(xs),max(xs))
    yb,Lw,xa,xb2 = best
    cx=(xa+xb2)//2
    ys=[y for y in range(y0,y1) if L(px[cx,y])>seuil]
    # colonne centrale : plus longue plage continue
    runs=[];cur=None
    for y in range(y0,y1):
        if L(px[cx,y])>seuil:
            if cur is None: cur=[y,y]
            else: cur[1]=y
        else:
            if cur: runs.append(tuple(cur)); cur=None
    if cur: runs.append(tuple(cur))
    r=max(runs,key=lambda r:r[1]-r[0]); Hh=r[1]-r[0]+1
    print(f"[{label}] ligne la plus large y={yb} : x={xa}..{xb2}  D_horiz={Lw}"
          f" | colonne x={cx} : y={r[0]}..{r[1]}  D_vert={Hh}  |L-H|={abs(Lw-Hh)}")
    return Lw,Hh,(xa,r[0],xb2,r[1])

lr,hr,bbr = disque(ref,760,1010,1170,1370,55,'REF')
lc,hc,bbc = disque(cap,820,1030,1400,1600,32,'CAP')
ok = abs(lr-hr)<=4 and abs(lc-hc)<=4
print(f"  CONTROLE POSITIF circularite : REF |L-H|={abs(lr-hr)} CAP |L-H|={abs(lc-hc)} (attendu <=4) -> {'OK' if ok else 'ECHEC'}")
print(f"  -> ANCRE D'ECHELLE : diametre REF={lr} px  CAP={lc} px  rapport={lc/lr:.4f}  ecart={lc-lr:+d} px ({(lc-lr)/lr*100:+.2f}%)")
print(f"     bbox REF={bbr}  bbox CAP={bbc}")

def radial(im,bb,frac,label):
    px=im.load(); cx=(bb[0]+bb[2])//2; cy=(bb[1]+bb[3])//2; rad=int((bb[2]-bb[0]+1)*frac)
    vals=[L(px[int(cx+rad*math.cos(k*math.pi/360.0)),int(cy+rad*math.sin(k*math.pi/360.0))]) for k in range(720)]
    print(f"  {label} couronne a {frac:.2f}xD (r={rad}) : min={min(vals):.0f} max={max(vals):.0f} "
          f"moy={statistics.mean(vals):.1f} ecart-type={statistics.pstdev(vals):.2f}")
    return statistics.pstdev(vals)
print("  -- crenelage : un jeton cranele module la luminance le long de sa couronne, un aplat non --")
a=radial(ref,bbr,0.44,'[REF]'); b=radial(cap,bbc,0.44,'[CAP]')
print(f"  rapport des ecarts-types REF/CAP = {a/b:.2f}x")
