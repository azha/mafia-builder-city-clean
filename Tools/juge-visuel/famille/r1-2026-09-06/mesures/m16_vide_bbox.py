# m16 — bbox complete des boites pointillees : pixels de TRAIT seulement (bg+8 < R < 110), texte exclu.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def bbox(im,x0,y0,x1,y1,bg,label,S,OX,OY):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b=px[x,y]
            if bg[0]+8<r<110 and abs(r-g)<14 and abs(g-b)<14: xs.append(x);ys.append(y)
    if not xs: print('  %s RIEN'%label); return
    bb=(min(xs),min(ys),max(xs),max(ys))
    print('  %-30s CSS x=%6.1f..%6.1f (l=%6.1f)  y=%6.1f..%6.1f (h=%5.1f)   px=%s'%(
        label,(bb[0]-OX)/S,(bb[2]-OX)/S,(bb[2]-bb[0]+1)/S,(bb[1]-OY)/S,(bb[3]-OY)/S,(bb[3]-bb[1]+1)/S,str(bb)))
    return bb
print('\nREFERENCE')
bbox(ref,120,730,1090,890,(22,25,27),'vide #1 (sous rang1)',2.0,0,0)
bbox(ref,120,1480,1090,1645,(22,25,27),'vide #3 (sous rang3)',2.0,0,0)
bbox(ref,40,1660,1090,1825,(22,25,27),'vide "Recruter"',2.0,0,0)
print('\nCAPTURE')
bbox(cap,120,935,1050,1095,(22,22,28),'vide #1',1.88036,13,232)
bbox(cap,120,1315,1050,1470,(22,22,28),'vide #2',1.88036,13,232)
bbox(cap,120,1695,1050,1850,(22,22,28),'vide #3',1.88036,13,232)
bbox(cap,40,1860,1050,2020,(22,22,28),'vide "Recruter"',1.88036,13,232)
print('\n-- couleur du trait pointille (mediane) --')
def trait(im,x0,y0,x1,y1,bg,label):
    px=im.load(); v=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b=px[x,y]
            if bg[0]+8<r<110 and abs(r-g)<14: v.append((r,g,b))
    if not v: print('  %s RIEN'%label); return
    print('  %-30s %s (n=%d)'%(label,tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3)),len(v)))
trait(ref,200,735,1060,742,(22,25,27),'REF trait haut vide#1')
trait(cap,180,944,1010,952,(22,22,28),'CAP trait haut vide#1')
