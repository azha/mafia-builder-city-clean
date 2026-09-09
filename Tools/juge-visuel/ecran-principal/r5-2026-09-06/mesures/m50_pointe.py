# MESURE DUE, finale : ou tombe la POINTE de l'aiguille par rapport a l'arc, a l'angle EXACT de l'aiguille.
from common import *
import math
def bande_a(im,hx,hy,ang,R,scale,label):
    px=im.load(); A=math.radians(ang); hits=[]
    r=R*0.18
    while r<R*0.72:
        x=int(round(hx+r*math.sin(A))); y=int(round(hy-r*math.cos(A))); c=px[x,y]
        mx,mn=max(c),min(c); sat=0 if mx==0 else (mx-mn)/mx
        if mx>60 and sat>0.2 and not(c[0]>195 and c[1]>185 and c[2]>160): hits.append((r,c))
        r+=0.25
    if not hits: print(f'  {label}: rien'); return None
    print(f'  {label} angle {ang:+.1f} deg : bande de l arc r {hits[0][0]/scale:5.2f}..{hits[-1][0]/scale:5.2f} CSS = {hits[0][0]/R:.4f}..{hits[-1][0]/R:.4f} R ; couleur {hits[len(hits)//2][1]}')
    return hits[0][0],hits[-1][0]
r=op(REF)
b=bande_a(r,587.5,130.5,-41.6,95.5,REF_S,'REF arc a l angle de l aiguille')
L=47.5
print(f'  REF pointe a {L/REF_S:.2f} CSS = {L/95.5:.4f} R  ->  profondeur dans la bande = {(L-b[0])/(b[1]-b[0])*100:.0f} % (0 % = bord interieur, 100 % = bord exterieur)')
c=op(C24)
b2=bande_a(c,539.5,114.0,61.9,110.5,CAP_S,'CAP arc a l angle de l aiguille')
L2=math.hypot(577-539.5,94-114.0)
print(f'  CAP pointe a {L2/CAP_S:.2f} CSS = {L2/110.5:.4f} R  ->  profondeur dans la bande = {(L2-b2[0])/(b2[1]-b2[0])*100:.0f} %')
print(f'  CAP longueur d aiguille / R = {L2/110.5:.4f} ; REF = {L/95.5:.4f} ; ecart {100*((L2/110.5)/(L/95.5)-1):+.1f} %')
