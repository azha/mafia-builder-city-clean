#!/usr/bin/env python3
"""m12b - MEDAILLON, fenetre corrigee : le 1er jet englobait le libelle 'LIBRE' sous le jeton
(controle positif de circularite ECHOUE -> instrument refute, fenetre resserree ici).
Methode : on part du centre du disque et on balaie en croix jusqu'au fond -> diametre vrai.
Controle positif : |L-H| <= 4 px sur les deux (un disque est circulaire).
"""
from PIL import Image
import os, statistics, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def croix(im,cx,cy,seuil,label):
    px=im.load(); W,H=im.size
    def marche(dx,dy):
        x,y=cx,cy; n=0
        while 0<=x<W and 0<=y<H and L(px[x,y])>seuil: x+=dx; y+=dy; n+=1
        return n
    g,d,h,b = marche(-1,0),marche(1,0),marche(0,-1),marche(0,1)
    Lw,Hh = g+d, h+b
    print(f"[{label}] centre=({cx},{cy}) seuil>{seuil} : gauche={g} droite={d} haut={h} bas={b}"
          f"  -> D_horiz={Lw} D_vert={Hh}  |L-H|={abs(Lw-Hh)}")
    return Lw,Hh,(cx-g,cy-h,cx+d,cy+b)

print("  centres pris au milieu du chiffre '1' de chaque jeton")
lr,hr,bbr = croix(ref,875,1280,55,'REF')
lc,hc,bbc = croix(cap,912,1508,35,'CAP')
ok = abs(lr-hr)<=4 and abs(lc-hc)<=4
print(f"  CONTROLE POSITIF circularite : REF |L-H|={abs(lr-hr)}  CAP |L-H|={abs(lc-hc)}  (attendu <=4) -> {'OK' if ok else 'ECHEC'}")
print(f"  -> ANCRE D'ECHELLE : diametre REF={lr} px  CAP={lc} px  rapport={lc/lr:.4f}  ecart={lc-lr:+d} px ({(lc-lr)/lr*100:+.2f}%)")

def radial(im,bb,frac,label):
    px=im.load(); cx=(bb[0]+bb[2])//2; cy=(bb[1]+bb[3])//2; rad=int((bb[2]-bb[0]+1)*frac)
    vals=[]
    for k in range(720):
        a=k*math.pi/360.0
        vals.append(L(px[int(cx+rad*math.cos(a)),int(cy+rad*math.sin(a))]))
    print(f"  {label} anneau a {frac:.2f}xD (r={rad}) : min={min(vals):.0f} max={max(vals):.0f} "
          f"moy={statistics.mean(vals):.1f} ecart-type={statistics.pstdev(vals):.2f}")
    return statistics.pstdev(vals)
print("  -- crenelage du bord : un jeton cranele module la luminance le long de sa couronne --")
a=radial(ref,bbr,0.44,'[REF]'); b=radial(cap,bbc,0.44,'[CAP]')
print(f"  ecart-type de la couronne : REF={a:.2f}  CAP={b:.2f}  -> rapport {a/b:.2f}x")
