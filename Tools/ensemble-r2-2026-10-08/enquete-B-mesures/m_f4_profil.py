# F4 : profil radial du manometre (maquette vs jeu). Teinte (HSV) au lieu du predicat RGB du juge,
# pour separer l'anneau d'or (teinte ~40deg) de l'arc (teal ~185deg / rouge ~5deg).
from PIL import Image
import colorsys, math, sys
REF="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference/E03-cadre-48.png"
CAP="/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final/E03_Chanedappro_1080x2400.png"
def classe(c):
    r,g,b=[v/255 for v in c[:3]]
    h,s,v=colorsys.rgb_to_hsv(r,g,b); h*=360
    if s>0.25 and v>0.30 and 30<=h<=52: return 'or'
    if s>0.20 and v>0.22 and 165<=h<=200: return 'teal'
    if s>0.30 and v>0.30 and (h<=14 or h>=345): return 'rouge'
    return '.'
DIAM={'REF':194,'JEU':184}
def mesure(path,label):
    im=Image.open(path).convert('RGB'); px=im.load(); W,H=im.size
    cx=W//2
    # centre vertical : anneau d'or sur colonne cx-60 (comme le juge) puis milieu haut/bas
    col=cx-60
    ys=[y for y in range(0,230) if classe(px[col,y])=='or']
    # centre : points d'or extremes en x sur la ligne medianne
    # on determine d'abord le rayon exterieur par le haut de l'anneau sur la colonne cx
    top=min(y for y in range(0,230) if classe(px[cx,y])=='or')
    # rayon exterieur par lecture horizontale a la ligne yc estimee (diametre = bas-haut sur colonne cx-60 -> approx)
    # on itere : yc candidate -> mesurer x gauche/droite d'or
    # diametre exterieur = valeur du juge (194 ref, 184 jeu), verifiee : or present a +-R sur la ligne du centre
    d=DIAM[label[:3]]; R=d/2; xc=cx
    cand=[]
    for yc in range(top+int(R)-4,top+int(R)+5):
        ok=sum(1 for dx in (-1,0,1) for sgn in (-1,1) if classe(px[xc+sgn*int(round(R-4))+dx,yc])=='or')
        cand.append((ok,yc))
    yc=max(cand)[1]
    print('   bord haut anneau y=',top,' centre retenu y=',yc,' (or a +-(R-4) sur la ligne: ',max(cand)[0],'/6 )')
    print(f"{label}: {W}x{H} centre=({xc},{yc}) diametre exterieur={d}px R={R:.1f}")
    # profil radial a plusieurs angles (haut du disque), hors aiguille
    for ang in (60,75,105,120,150,30):
        a=math.radians(ang); seq=[]
        for r in [i*0.5 for i in range(0,int(R*2)+6)]:
            x=xc+r*math.cos(a); y=yc-r*math.sin(a)
            seq.append((r,classe(px[int(round(x)),int(round(y))])))
        # segments
        segs=[];cur=None
        for r,c in seq:
            if c!=cur:
                if cur not in (None,'.'): segs.append((cur,start,prev))
                cur=c;start=r
            prev=r
        if cur not in (None,'.'): segs.append((cur,start,prev))
        txt=' '.join(f"{c}[{s:.1f}-{e:.1f}]" for c,s,e in segs)
        print(f"   {ang:3d}deg : {txt}")
    return R
mesure(REF,'REF E03-cadre-48'); mesure(CAP,'JEU E03 2400')
