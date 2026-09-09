# m31 — chevron du bouton retour : bbox, taille, centrage dans le cercle, couleur.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
enc=lambda p: p[0]>90 and p[1]>80
def chev(im,x0,y0,x1,y1,cx,cy,S,label):
    px=im.load(); xs=[];ys=[];cols=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if enc(p): xs.append(x);ys.append(y);cols.append(p)
    if not xs: print('  %s RIEN'%label); return
    b=(min(xs),min(ys),max(xs),max(ys))
    cols.sort(key=lambda p:-sum(p)); sel=cols[:25]
    print('  %-20s bbox=%-22s l=%.2f h=%.2f CSS | centre glyphe (%.1f,%.1f) vs centre cercle (%.1f,%.1f) ecart (%.2f,%.2f) CSS'%(
        label,str(b),(b[2]-b[0]+1)/S,(b[3]-b[1]+1)/S,(b[0]+b[2])/2,(b[1]+b[3])/2,cx,cy,
        ((b[0]+b[2])/2-cx)/S,((b[1]+b[3])/2-cy)/S))
    print('        couleur = %s  (n=%d)'%(tuple(sorted(c[i] for c in sel)[len(sel)//2] for i in range(3)),len(cols)))
# REF cercle bbox (52,68,163,179) -> centre (107.5,123.5)
chev(ref,70,90,150,165,107.5,123.5,2.0,'REF chevron')
# CAP cercle bbox (62,289,167,393) -> centre (114.5,341)
chev(cap,80,310,155,380,114.5,341.0,1.88036,'CAP chevron')
