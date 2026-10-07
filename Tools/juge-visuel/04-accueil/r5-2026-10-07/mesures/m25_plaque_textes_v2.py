# m25 — textes de la plaque TRANCHER, fenetre elargie a x>=55 (m24 coupait a 90 et rendait
# un bord gauche FAUX, egal a sa propre fenetre).
# Controle positif : la couleur de « LEGERE » doit valoir le jeton #8c8272 = (140,130,114).
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
PLQ={'REF':(1674,1825,46,1033),'JEU1920':(1487,1635,47,1032),'JEU2400':(1906,2103,47,1032)}
def analyse(im,nom):
    px=im.load(); y0,y1,px0,px1=PLQ[nom]
    base=med([lum(px[x,y]) for y in range(y0+12,y1-12) for x in range(60,700)])
    print(f'  --- {nom} plaque y{y0}..{y1} h={y1-y0+1}, x {px0}..{px1} ---')
    bandes=[];cur=None
    for y in range(y0+6,y1-5):
        xs=[x for x in range(55,760) if lum(px[x,y])-base>22]
        if xs and cur is None: cur=[y,min(xs),max(xs)]
        elif xs: cur[1]=min(cur[1],min(xs)); cur[2]=max(cur[2],max(xs))
        elif cur is not None: bandes.append((cur[0],y-1,cur[1],cur[2])); cur=None
    if cur: bandes.append((cur[0],y1-6,cur[1],cur[2]))
    for a,z,xa,xb in bandes:
        pp=[(x,y) for y in range(a,z+1) for x in range(xa,xb+1) if lum(px[x,y])-base>30]
        pp=sorted(pp,key=lambda q:lum(px[q[0],q[1]]),reverse=True)[:60]
        col=tuple(med([px[q[0],q[1]][k] for q in pp]) for k in range(3)) if pp else None
        print(f'    bande y {a}..{z} h={z-a+1}  x {xa}..{xb} l={xb-xa+1}  marge G={xa-px0}  encre {col}')
    # TRANCHER
    pts=[(x,y) for y in range(y0,y1) for x in range(700,1025) if px[x,y][0]>120 and px[x,y][0]-px[x,y][2]>50]
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f'    TRANCHER x {min(xs)}..{max(xs)} l={max(xs)-min(xs)+1} CAPh={max(ys)-min(ys)+1} margeD={px1-max(xs)}')
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: analyse(charge(p),n)
