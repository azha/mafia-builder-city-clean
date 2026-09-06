# Grandeur : barre de ratio du bloc ARGENT (partie remplie / partie vide), volutes, fleche retour.
# Controle positif : REF barre x 16..90 CSS (74 CSS) — coherent avec .aile.gauche x=17 w=96.
from common import *
def barre(im,y,x0,x1,scale,label):
    px=im.load(); print(f'  {label} y={y} ({y/scale:.2f} CSS)')
    segs=[];cur=None
    for x in range(x0,x1):
        c=px[x,y]
        if lum(c)>60:
            if cur and (abs(c[0]-cur[2][0])<25 and abs(c[2]-cur[2][2])<25): cur[1]=x
            else:
                if cur: segs.append(tuple(cur[:2])+(cur[2],))
                cur=[x,x,c]
        else:
            if cur: segs.append(tuple(cur[:2])+(cur[2],)); cur=None
    if cur: segs.append(tuple(cur[:2])+(cur[2],))
    for a,b,c in segs:
        if b-a>3: print(f'     x {a}..{b} = {a/scale:7.2f}..{(b+1)/scale:7.2f} CSS (l={(b-a+1)/scale:6.2f})  couleur {c}')
r=op(REF)
for y in (123,125): barre(r,y,20,340,REF_S,'REF barre')
c=op(C24)
for y in (141,144): barre(c,y,60,460,CAP_S,'CAP2400 barre')
t=op(T24)
for y in (120,121): barre(t,y,20,340,CAP_S,'TEMOIN barre')
