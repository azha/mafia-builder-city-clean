# m15 (v2) — boites ".vide" : bbox du cadre pointille (colonnes >=150px pour exclure les rails).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def frames(im,y0,y1,x0,x1,bg,label,S,OX,OY):
    px=im.load(); n=x1-x0
    print('\n %s (colonnes %d..%d)'%(label,x0,x1))
    rows=[]
    for y in range(y0,y1):
        c=sum(1 for x in range(x0,x1) if px[x,y][0]>bg[0]+8)
        rows.append((y,c))
    grp=[];start=None;prev=None
    for y,c in rows:
        if c>0.35*n:
            if start is None or y-prev>3:
                if start is not None: grp.append((start,prev))
                start=y
            prev=y
    if start is not None: grp.append((start,prev))
    for a,b in grp:
        xs=[x for y in range(a,b+1) for x in range(x0,x1) if px[x,y][0]>bg[0]+8]
        print('   trait horizontal y=%4d..%4d | CSS y=%6.1f | x CSS %6.1f..%6.1f  l=%6.1f'%(
            a,b,(a-OY)/S,(min(xs)-OX)/S,(max(xs)-OX)/S,(max(xs)-min(xs)+1)/S))
    return grp
frames(ref,700,1850,150,1090,(22,25,27),'REFERENCE',2.0,0,0)
frames(cap,900,2150,150,1050,(22,22,28),'CAPTURE',1.88036,13,232)
