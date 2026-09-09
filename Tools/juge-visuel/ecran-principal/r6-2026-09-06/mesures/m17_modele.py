# m17 — fond du cadran (radial vs plat) + test du MODELE de melange sur les 2 couleurs d'arc
from lib import *
import math, json
C=json.load(open('centres.json'))
def at(im,cx,cy,R,frac,deg,s,rad=2):
    th=math.radians(deg); x=cx+frac*R*math.cos(th); y=cy-frac*R*math.sin(th)
    return med_win(im,x,y,rad)

print("== m17a fond du cadran : 4 sondes symetriques a 0.55 R (hors arc) ==")
r=load(REF); d=load(DIS24)
for im,key,s,nm in [(r,'ref',S_REF,'REFERENCE'),(d,'dis24',S_CAP,'JEU 2400')]:
    cx,cy,R=C[key]
    vals=[]
    for deg in (225,315,135,45):
        # 45/135 sont dans l'arc -> on descend a 0.25 R pour le haut, 0.55 pour le bas
        f=0.25 if deg in (45,135) else 0.55
        c=at(im,cx,cy,R,f,deg,s)
        vals.append(c); print(f"    {nm} {deg:3d} deg a {f:.2f}R : {tuple(int(v) for v in c)} L={lum(c):.1f}")
    amp=tuple(int(max(v[k] for v in vals)-min(v[k] for v in vals)) for k in range(3))
    print(f"    {nm} AMPLITUDE entre les 4 sondes : {amp}")
print()
print("== m17b modele de melange sur l'arc ==")
def lin(v): 
    v/=255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def unlin(v):
    v=max(0.0,min(1.0,v))
    return 255*(12.92*v if v<=0.0031308 else 1.055*v**(1/2.4)-0.055)
def comp_srgb(src,a,bg): return tuple(a*src[k]+(1-a)*bg[k] for k in range(3))
def comp_lin(src,a,bg): return tuple(unlin(a*lin(src[k])+(1-a)*lin(bg[k])) for k in range(3))
def d3(a,b): return math.sqrt(sum((a[k]-b[k])**2 for k in range(3)))

srcs={'teal':((127,212,217),85/255.),'braise':((224,102,74),136/255.)}
# fond immediatement SOUS l'arc (meme rayon, angle hors arc) :
r_cx,r_cy,r_R=C['ref']; d_cx,d_cy,d_R=C['dis24']
bg_ref = at(r,r_cx,r_cy,r_R,0.44,70,S_REF)     # 70 deg = dans le creneau NEUTRE du canon
bg_jeu = at(d,d_cx,d_cy,d_R,0.44,270,S_CAP)    # sous le cadran, meme rayon
print(f"    fond canon sous l'arc (0.44R, 70 deg, creneau neutre) : {tuple(int(v) for v in bg_ref)}")
print(f"    fond jeu   (0.44R, 270 deg)                            : {tuple(int(v) for v in bg_jeu)}")
mes={'ref':{'teal':(67,100,111),'braise':(131,69,61)},
     'jeu':{'teal':(97,132,136),'braise':(169,101,89)}}
for k,(src,a) in srcs.items():
    ps_r=comp_srgb(src,a,bg_ref); pl_r=comp_lin(src,a,bg_ref)
    ps_j=comp_srgb(src,a,bg_jeu); pl_j=comp_lin(src,a,bg_jeu)
    print(f"    [{k}] source {src} alpha={a:.3f}")
    print(f"       CANON mesure {mes['ref'][k]} | prediction sRGB {tuple(round(v) for v in ps_r)} d={d3(ps_r,mes['ref'][k]):5.1f}"
          f" | prediction LINEAIRE {tuple(round(v) for v in pl_r)} d={d3(pl_r,mes['ref'][k]):5.1f}")
    print(f"       JEU   mesure {mes['jeu'][k]} | prediction sRGB {tuple(round(v) for v in ps_j)} d={d3(ps_j,mes['jeu'][k]):5.1f}"
          f" | prediction LINEAIRE {tuple(round(v) for v in pl_j)} d={d3(pl_j,mes['jeu'][k]):5.1f}")
