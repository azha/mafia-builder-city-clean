# m40 — aiguille : direction, longueur depuis le pivot, epaisseur (mi-amplitude perpendiculaire)
from lib import *
import math, json
C=json.load(open('centres.json'))
PIV={'ref':(587.5,130.5),'dis24':(539.5,96.0),'cap19':(539.5,96.0)}
def creme(c): return all(abs(c[k]-(234,224,200)[k])<=34 for k in range(3))
def sweep(im,pv,R,s,label,exclude=None):
    best=None
    for i in range(720):
        th=math.radians(i/2.0)
        t=2.0; last=0
        while t<0.95*R:
            x=pv[0]+t*math.cos(th); y=pv[1]-t*math.sin(th)
            if not(0<=x<im.size[0] and 0<=y<im.size[1]): break
            if creme(im.getpixel((int(x),int(y)))): last=t
            elif t-last>3: break
            t+=0.5
        if best is None or last>best[1]: best=(i/2.0,last)
    ang,L=best
    print(f"    {label}: direction {ang:.1f} deg, longueur {L:.1f} px = {L/s:.2f} CSS")
    # epaisseur a mi-longueur, perpendiculaire
    th=math.radians(ang); px_=pv[0]+0.5*L*math.cos(th); py_=pv[1]-0.5*L*math.sin(th)
    perp=th+math.pi/2; n=0
    for u in [k*0.25 for k in range(-40,41)]:
        x=px_+u*math.cos(perp); y=py_-u*math.sin(perp)
        if 0<=x<im.size[0] and 0<=y<im.size[1] and creme(im.getpixel((int(x),int(y)))): n+=1
    print(f"       epaisseur a mi-longueur ~{n*0.25:.2f} px = {n*0.25/s:.2f} CSS")
    return ang,L/s
print("== m40 aiguille ==")
r=load(REF); d=load(DIS24)
sweep(r,PIV['ref'],C['ref'][2],S_REF,'REFERENCE (attention : « 37% » est aussi en creme)')
sweep(d,PIV['dis24'],C['dis24'][2],S_CAP,'JEU district 2400')
