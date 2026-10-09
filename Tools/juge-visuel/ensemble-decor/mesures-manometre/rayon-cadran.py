#!/usr/bin/env python3
"""Rayon médian de l'arc du manomètre / rayon extérieur du boîtier, mesuré sur les planches.
Maquette (.mano, ecrans-brennar-6.html:197-199) : arc A15 dans un disque de 54 px => 15/27 = 0,5556.
Usage : rayon-cadran.py [--controle] planche.png ...
Pas de numpy : moindres carrés (Kåsa) écrits à la main. Chaque image ouverte imprime sa taille."""
import sys, math, statistics
from PIL import Image
CANON = 15/27

def solve3(A, b):
    # Cramer sur système 3x3
    def det(m): return (m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]))
    d = det(A); out = []
    for k in range(3):
        m = [row[:] for row in A]
        for i in range(3): m[i][k] = b[i]
        out.append(det(m)/d)
    return out

def fit_cercle(pts):
    n = len(pts); sx=sy=sxx=syy=sxy=sz=sxz=syz=0.0
    for x,y in pts:
        z = x*x+y*y; sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; sz+=z; sxz+=x*z; syz+=y*z
    a,b,c = solve3([[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,n]],[sxz,syz,sz])
    cx, cy = a/2, b/2
    return cx, cy, math.sqrt(max(c+cx*cx+cy*cy,0))

def mesurer(chemin):
    im = Image.open(chemin).convert('RGB'); W,H = im.size
    print(f'  [{chemin.split("/")[-1]}] image {W}x{H}')
    s = W/1080.0
    x0,x1,y0,y1 = int(380*s),int(700*s),0,int(130*s)   # au-dessus du filet horizontal (y≈142)
    px = im.load()
    pts = []
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b = px[x,y]
            if r>110 and r-b>55 and g>0.7*r and g>b+25: pts.append((x,y))
    cx,cy,R = fit_cercle(pts)
    for _ in range(6):   # écarte le pivot de l'aiguille et tout ce qui n'est pas l'anneau
        d = [math.hypot(x-cx,y-cy) for x,y in pts]; med = statistics.median(d)
        pts = [p for p,dd in zip(pts,d) if abs(dd-med) < 0.08*med]
        cx,cy,R = fit_cercle(pts)
    d = [math.hypot(x-cx,y-cy) for x,y in pts]
    rext = max(sorted(d)[int(len(d)*0.98)-1], 0)   # bord extérieur de l'anneau (98e percentile)
    # arc : pixels teal (froid) ou rouge (alarme), saturés, entre 0,3 et 0,85 du rayon extérieur
    arc = []
    for y in range(int(cy-rext), int(cy+rext*0.2)):
        for x in range(int(cx-rext), int(cx+rext)):
            r,g,b = px[x,y]; rho = math.hypot(x-cx,y-cy)
            if not (0.3*rext < rho < 0.85*rext): continue
            teal = g>r+18 and b>r+18 and max(r,g,b)>85
            rouge = r>g+45 and r>b+40 and r>110
            if teal or rouge: arc.append(rho)
    rarc = statistics.median(arc)
    print(f'    centre=({cx:.1f},{cy:.1f}) [centre x attendu {W/2:.1f}]  anneau: ajusté {R:.2f}px, extérieur {rext:.2f}px ({len(pts)} px)')
    print(f'    arc: {len(arc)} px, rayon médian {rarc:.2f}px  =>  rapport {rarc/rext:.4f}  (maquette {CANON:.4f}, delta {rarc/rext-CANON:+.4f})')
    return rarc/rext, abs(cx-W/2)

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    res = [mesurer(a) for a in args]
    if '--controle' in sys.argv:
        r = res[0][0]
        print(f'  [contrôle négatif] l\'ancien canon 0,45 donnerait {0.45:.4f} ; mesuré {r:.4f} => discrimine : {abs(r-0.45) > 0.05}')
