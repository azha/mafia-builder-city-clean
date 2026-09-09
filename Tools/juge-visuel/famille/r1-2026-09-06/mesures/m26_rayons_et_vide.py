# m26 — rayon des coins (par l'etendue du liseré de bord haut) + texte des boites .vide.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def rayon(im,y,x0,x1,seuil,label,S,OX,bordg,bordd):
    px=im.load()
    xs=[x for x in range(x0,x1) if px[x,y][0]>seuil]
    if not xs: print('  %s RIEN'%label); return
    print('  %-30s liseré x=%d..%d | rayon gauche=%.1f CSS  droit=%.1f CSS'%(
        label,min(xs),max(xs),(min(xs)-bordg)/S,(bordd-max(xs))/S))
print('\nRAYON des rangs (liseré interne haut, 1er px du rang)')
rayon(ref,909,90,1085,40,'REF rang2 (bords px 97..1074)',2.0,0,97,1074)
rayon(ref,910,90,1085,40,'REF rang2 (2e ligne)',2.0,0,97,1074)
rayon(cap,1108,95,1035,40,'CAP rang2 (bords px 104..1024)',1.88036,13,104,1024)
rayon(cap,1109,95,1035,40,'CAP rang2 (2e ligne)',1.88036,13,104,1024)
print('\nRAYON de la boite .vide (trait pointille haut)')
rayon(ref,737,180,1090,32,'REF vide#1 (bords px 194..1074)',2.0,0,194,1074)
rayon(cap,947,180,1035,32,'CAP vide#1 (bords px 196..1024)',1.88036,13,196,1024)
print('\nTEXTE des boites .vide : bbox, hauteur de capitale, centrage')
crm=lambda p: p[0]>110 and 8<=p[0]-p[2]<=60 and p[1]>100
def txt(im,x0,y0,x1,y1,label,S,OX,OY,bx0,bx1):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if crm(px[x,y]): xs.append(x);ys.append(y)
    if not xs: print('  %s RIEN'%label); return
    b=(min(xs),min(ys),max(xs),max(ys))
    cx=(b[0]+b[2])/2; boite=(bx0+bx1)/2
    print('  %-26s CSS x=%6.1f..%6.1f (l=%5.1f) y=%6.1f..%6.1f (h=%5.2f) | centre texte %.1f vs centre boite %.1f (ecart %.1f)'%(
        label,(b[0]-OX)/S,(b[2]-OX)/S,(b[2]-b[0]+1)/S,(b[1]-OY)/S,(b[3]-OY)/S,(b[3]-b[1]+1)/S,
        (cx-OX)/S,(boite-OX)/S,(cx-boite)/S))
txt(ref,200,760,1070,860,'REF "Aucune equipe..."',2.0,0,0,194,1074)
txt(cap,200,980,1020,1070,'CAP "Aucune equipe..."',1.88036,13,232,196,1024)
txt(ref,60,1690,1070,1800,'REF "Recruter..."',2.0,0,0,45,1074)
txt(cap,60,1900,1020,2000,'CAP "Recruter..."',1.88036,13,232,55,1024)
