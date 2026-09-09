# m13 — la puce (chip cyan) : bbox du contour, hauteur, couleur du trait, rayon apparent.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
# trait cyan translucide (#7fd4d955 sur panneau) : bleu-vert, peu lumineux
cy=lambda p: p[2]-p[0]>12 and p[2]>45 and p[1]>=p[0]
def box(im,x0,y0,x1,y1,label,S,OX,OY):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if cy(px[x,y]): xs.append(x);ys.append(y)
    if not xs: print('  %s RIEN'%label); return
    b=(min(xs),min(ys),max(xs),max(ys))
    print('  %-24s px=%-24s | CSS x=%6.1f..%6.1f y=%6.1f..%6.1f  l=%5.1f  h=%5.2f'%(
        label,str(b),(b[0]-OX)/S,(b[2]-OX)/S,(b[1]-OY)/S,(b[3]-OY)/S,(b[2]-b[0]+1)/S,(b[3]-b[1]+1)/S))
    # couleur du trait : mediane sur le bord gauche vertical
    xm=b[0]
    cols=[px[xm,y] for y in range(b[1],b[3]+1) if cy(px[xm,y])]
    if cols:
        print('       trait gauche : %s (n=%d)'%(tuple(sorted(c[i] for c in cols)[len(cols)//2] for i in range(3)),len(cols)))
    return b
SR,OXR,OYR=2.0,0,0
SC,OXC,OYC=1.88036,13,232
print('\nREFERENCE chip .del')
box(ref,290,1355,560,1425,'rang3 DELEGUE',SR,OXR,OYR)
box(ref,290,600,560,680,'rang1 DELEGUE (actif)',SR,OXR,OYR)
print('\nCAPTURE chip')
box(cap,240,1580,560,1650,'rang3 RECENT',SC,OXC,OYC)
box(cap,240,1200,560,1270,'rang2 RECENT',SC,OXC,OYC)
