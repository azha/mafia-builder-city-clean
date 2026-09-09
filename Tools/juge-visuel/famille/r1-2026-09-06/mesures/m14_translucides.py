# m14 — translucidites : pixel RESULTANT mesure vs prediction sRGB et prediction LINEAIRE.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def s2l(c):
    c=c/255.0
    return (c/12.92) if c<=0.04045 else ((c+0.055)/1.055)**2.4
def l2s(v):
    v=max(0.0,min(1.0,v))
    s=(v*12.92) if v<=0.0031308 else 1.055*(v**(1/2.4))-0.055
    return round(s*255)
def pred_srgb(bg,fg,a): return tuple(round(bg[i]+a*(fg[i]-bg[i])) for i in range(3))
def pred_lin(bg,fg,a):  return tuple(l2s(s2l(bg[i])*(1-a)+s2l(fg[i])*a) for i in range(3))
def med(im,x0,y0,x1,y1):
    px=im.load(); v=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): v[i].append(p[i])
    return tuple(sorted(c)[len(c)//2] for c in v)
def peak(im,xs,ys):
    px=im.load(); best=None
    for y in ys:
        for x in xs:
            p=px[x,y]; s=sum(p)
            if best is None or s>best[0]: best=(s,p,(x,y))
    return best[1],best[2]
print('\n=== 1. bordure pointillee de la boite "vide" (#ffffff22, alpha=0.1333) ===')
# REF : boite vide sous rang1, y ~ 735..870, bord gauche x ~ 196
print(' REF fond feuille local :',med(ref,150,780,190,820))
p,pos=peak(ref,range(190,210),range(760,860)); print(' REF trait (pic) =',p,'@',pos)
print(' CAP fond feuille local :',med(cap,140,1400,170,1440))
p2,pos2=peak(cap,range(160,180),range(1380,1470)); print(' CAP trait (pic) =',p2,'@',pos2)
for nm,bg in (('REF',med(ref,150,780,190,820)),('CAP',med(cap,140,1400,170,1440))):
    print('   %s prediction sRGB=%s  lineaire=%s'%(nm,pred_srgb(bg,(255,255,255),34/255.0),pred_lin(bg,(255,255,255),34/255.0)))
print('\n=== 2. bordure du bouton retour (#ffffff26, alpha=0.149) ===')
print(' REF fond tete :',med(ref,30,100,60,140))
p,pos=peak(ref,range(50,58),range(110,140)); print(' REF trait =',p,'@',pos)
print(' CAP fond tete :',med(cap,30,320,60,360))
p2,pos2=peak(cap,range(60,68),range(320,360)); print(' CAP trait =',p2,'@',pos2)
for nm,bg in (('REF',med(ref,30,100,60,140)),('CAP',med(cap,30,320,60,360))):
    print('   %s prediction sRGB=%s  lineaire=%s'%(nm,pred_srgb(bg,(255,255,255),38/255.0),pred_lin(bg,(255,255,255),38/255.0)))
print('\n=== 3. bordure de la puce (#7fd4d955, alpha=0.333) sur le panneau ===')
print(' REF fond panneau local :',med(ref,320,1385,340,1400))
p,pos=peak(ref,range(304,310),range(1375,1405)); print(' REF trait =',p,'@',pos)
print(' CAP fond panneau local :',med(cap,315,1605,335,1620))
p2,pos2=peak(cap,range(299,305),range(1600,1630)); print(' CAP trait =',p2,'@',pos2)
for nm,bg in (('REF',med(ref,320,1385,340,1400)),('CAP',med(cap,315,1605,335,1620))):
    print('   %s prediction sRGB=%s  lineaire=%s'%(nm,pred_srgb(bg,(127,212,217),85/255.0),pred_lin(bg,(127,212,217),85/255.0)))
print('\n=== 4. bordure du don-rang (#d9ab4e44, alpha=0.267) ===')
print(' REF fond hors don-rang :',med(ref,20,350,40,400))
p,pos=peak(ref,range(45,52),range(330,420)); print(' REF trait =',p,'@',pos)
print(' CAP fond hors don-rang :',med(cap,25,580,45,630))
p2,pos2=peak(cap,range(54,62),range(570,650)); print(' CAP trait =',p2,'@',pos2)
