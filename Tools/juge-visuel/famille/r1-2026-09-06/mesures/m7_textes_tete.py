# m7 (v2) — titre / sous-titre : bbox d'encre, hauteur de capitale, chasse, couleur.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def ink_bbox(im,x0,y0,x1,y1,pred,label,scale,ox,oy):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(px[x,y]): xs.append(x);ys.append(y)
    if not xs: print(' %s : AUCUNE encre'%label); return None
    bb=(min(xs),min(ys),max(xs),max(ys))
    print(' %-24s bbox=%-26s w=%3d h=%3d | CSS x=%6.1f..%6.1f  y=%6.1f..%6.1f  chasse=%5.1f  capitale=%4.1f'%(
        label,str(bb),bb[2]-bb[0]+1,bb[3]-bb[1]+1,
        (bb[0]-ox)/scale,(bb[2]-ox)/scale,(bb[1]-oy)/scale,(bb[3]-oy)/scale,
        (bb[2]-bb[0]+1)/scale,(bb[3]-bb[1]+1)/scale))
    return bb
orv=lambda p: p[0]>140 and p[0]-p[2]>40
crm=lambda p: p[0]>110 and 8<=p[0]-p[2]<=60 and p[1]>100
print('\nREFERENCE (scale 2.0, origine feuille 0,0)')
ink_bbox(ref,190,60,1100,140,orv,'titre LA FAMILLE',2.0,0,0)
ink_bbox(ref,190,145,1100,200,crm,'sous 3 LIEUTENANTS',2.0,0,0)
print('\nCAPTURE (scale 1.88036, origine feuille 13,232)')
ink_bbox(cap,180,255,1050,345,orv,'titre LA FAMILLE',1.88036,13,232)
ink_bbox(cap,180,350,1050,400,crm,'sous 3 LIEUTENANTS',1.88036,13,232)
print('\n-- couleurs (mediane des 20 pixels les plus clairs de la zone) --')
def top_color(im,x0,y0,x1,y1,label):
    px=im.load(); ps=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]; ps.append((p[0]+p[1]+p[2],p))
    ps.sort(reverse=True)
    sel=[p for _,p in ps[:40]]
    m=tuple(sorted(c[i] for c in sel)[len(sel)//2] for i in range(3))
    print('  %-24s %s'%(label,m))
top_color(ref,200,70,610,115,'REF titre')
top_color(cap,190,270,600,330,'CAP titre')
top_color(ref,200,155,505,185,'REF sous-titre')
top_color(cap,190,360,510,385,'CAP sous-titre')
