# m22 — le rang du Don : nom (or-vif) et role (creme-2) — bbox, hauteur de capitale, position.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
orv=lambda p: p[0]>140 and p[0]-p[2]>40
crm=lambda p: p[0]>110 and 8<=p[0]-p[2]<=60 and p[1]>100
def lines(im,x0,y0,x1,y1,pred,label,S,OX,OY):
    px=im.load(); rows=[]
    for y in range(y0,y1):
        rows.append(sum(1 for x in range(x0,x1) if pred(px[x,y])))
    runs=[];s=None
    for i,v in enumerate(rows):
        if v and s is None: s=i
        if not v and s is not None: runs.append((y0+s,y0+i-1)); s=None
    if s is not None: runs.append((y0+s,y1-1))
    print('\n %s'%label)
    for a,b in runs:
        xs=[x for y in range(a,b+1) for x in range(x0,x1) if pred(px[x,y])]
        print('   y=%4d..%4d  CSS y=%6.1f..%6.1f h=%5.2f | x CSS %6.1f..%6.1f chasse=%5.1f'%(
            a,b,(a-OY)/S,(b-OY)/S,(b-a+1)/S,(min(xs)-OX)/S,(max(xs)-OX)/S,(max(xs)-min(xs)+1)/S))
def gl(im,x0,y0,x1,y1,pred,label,S,OX):
    px=im.load(); cols=[]
    for x in range(x0,x1):
        cols.append(sum(1 for y in range(y0,y1) if pred(px[x,y])))
    runs=[];s=None
    for i,v in enumerate(cols):
        if v and s is None: s=i
        if not v and s is not None: runs.append((x0+s,x0+i-1)); s=None
    if s is not None: runs.append((x0+s,x1-1))
    print(' %s : %d glyphes'%(label,len(runs)))
    prev=None
    for a,b in runs:
        ys=[y for xx in range(a,b+1) for y in range(y0,y1) if pred(px[xx,y])]
        gap='' if prev is None else ' gap=%.2f'%((a-prev-1)/S)
        print('    x=%4d..%4d l=%5.2f  h=%5.2f%s'%(a,b,(b-a+1)/S,(max(ys)-min(ys)+1)/S,gap)); prev=b
SR,OXR,OYR=2.0,0,0
SC,OXC,OYC=1.88036,13,232
lines(ref,250,300,900,450,orv,'REF don : nom (or-vif)',SR,OXR,OYR)
lines(ref,250,380,900,450,crm,'REF don : role (creme-2)',SR,OXR,OYR)
lines(cap,240,530,900,700,orv,'CAP don : nom (or-vif)',SC,OXC,OYC)
lines(cap,240,590,900,700,crm,'CAP don : role (creme-2)',SC,OXC,OYC)
print('\n--- glyphes du nom du Don ---')
gl(ref,255,320,900,375,orv,'REF "Don V."',SR,OXR)
gl(cap,245,540,900,610,orv,'CAP "VOUS"',SC,OXC)
print('\n--- glyphes du role du Don ---')
gl(ref,255,390,900,430,crm,'REF "VOUS"',SR,OXR)
gl(cap,245,615,900,660,crm,'CAP "LE DON"',SC,OXC)
