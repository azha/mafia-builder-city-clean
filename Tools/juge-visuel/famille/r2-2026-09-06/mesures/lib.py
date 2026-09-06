from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def charger():
    ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
    cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
    print(f'[lib] REFERENCE {ref.size}  CAPTURE {cap.size}')
    R=dict(nom='REF', im=ref, ox=0.0, oy=0.0, f=2.0)
    C=dict(nom='JEU', im=cap, ox=13.0, oy=232.0, f=1053/560)
    return R,C
def P(S,xc,yc):           # CSS -> pixel
    return (S['ox']+xc*S['f'], S['oy']+yc*S['f'])
def px(S,xc,yc):
    x,y=P(S,xc,yc); return S['im'].getpixel((int(round(x)),int(round(y))))
def toCSS(S,x,y): return ((x-S['ox'])/S['f'], (y-S['oy'])/S['f'])
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def rel(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def contraste(a,b):
    la,lb=rel(a),rel(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def mediane(S,x0,y0,x1,y1):
    """mediane RGB d'une fenetre donnee en CSS"""
    a=P(S,x0,y0); b=P(S,x1,y1); im=S['im'].load()
    r=[];g=[];bl=[]
    for y in range(int(a[1]),int(b[1])):
        for x in range(int(a[0]),int(b[0])):
            c=im[x,y]; r.append(c[0]); g.append(c[1]); bl.append(c[2])
    r.sort();g.sort();bl.sort();n=len(r)//2
    return (r[n],g[n],bl[n])
def bbox_encre(S,x0,y0,x1,y1,fond,seuil=28):
    """bbox de l'encre (px s'ecartant du fond de plus de seuil en distance L1) dans une fenetre CSS.
    Rend (x0,y0,x1,y1) en CSS, bord d'encre inclus."""
    a=P(S,x0,y0); b=P(S,x1,y1); im=S['im'].load()
    X0=Y0=10**9; X1=Y1=-10**9
    for y in range(int(a[1]),int(b[1])):
        for x in range(int(a[0]),int(b[0])):
            c=im[x,y]
            if abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>seuil:
                if x<X0:X0=x
                if x>X1:X1=x
                if y<Y0:Y0=y
                if y>Y1:Y1=y
    if X1<X0: return None
    c0=toCSS(S,X0,Y0); c1=toCSS(S,X1+1,Y1+1)
    return (round(c0[0],2),round(c0[1],2),round(c1[0],2),round(c1[1],2))
