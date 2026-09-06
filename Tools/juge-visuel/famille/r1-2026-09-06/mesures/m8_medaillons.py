# m8 — medaillons : diametre (bbox de l'anneau), couleur de l'anneau, epaisseur.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
# anneau = pixel chaud (R-B>25) et assez clair (R>90)
ring=lambda p: p[0]>90 and p[0]-p[2]>25
def bbox(im,x0,y0,x1,y1,pred,label,scale,ox,oy):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(px[x,y]): xs.append(x);ys.append(y)
    if not xs: print('  %s : rien'%label); return
    bb=(min(xs),min(ys),max(xs),max(ys))
    print('  %-22s bbox=%-24s d=%dx%d px | CSS centre=(%.1f,%.1f) diam=%.1fx%.1f'%(
        label,str(bb),bb[2]-bb[0]+1,bb[3]-bb[1]+1,
        ((bb[0]+bb[2])/2-ox)/scale,((bb[1]+bb[3])/2-oy)/scale,
        (bb[2]-bb[0]+1)/scale,(bb[3]-bb[1]+1)/scale))
    return bb
print('\nREFERENCE')
bbox(ref,70,290,250,460,ring,'medl don',2.0,0,0)
bbox(ref,110,520,300,690,ring,'medl rang1',2.0,0,0)
bbox(ref,110,925,300,1095,ring,'medl rang2',2.0,0,0)
print('\nCAPTURE')
bbox(cap,70,530,250,690,ring,'medl don',1.88036,13,232)
bbox(cap,110,745,300,905,ring,'medl rang1',1.88036,13,232)
bbox(cap,110,1125,300,1285,ring,'medl rang2',1.88036,13,232)
print('\n-- couleur de l anneau (mediane des 30 px les plus chauds) --')
def ringcol(im,x0,y0,x1,y1,label):
    px=im.load(); ps=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if ring(p): ps.append((p[0]-p[2],p))
    ps.sort(reverse=True); sel=[p for _,p in ps[:30]]
    if not sel: print('  %s rien'%label); return
    print('  %-22s %s  (n=%d)'%(label,tuple(sorted(c[i] for c in sel)[len(sel)//2] for i in range(3)),len(ps)))
ringcol(ref,70,290,250,460,'REF anneau don')
ringcol(cap,70,530,250,690,'CAP anneau don')
ringcol(ref,110,520,300,690,'REF anneau rang1')
ringcol(cap,110,745,300,905,'CAP anneau rang1')
