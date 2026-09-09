# m6 — la tete : separateur laiton, bouton retour, titre, sous-titre.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def gold(p): return p[0]>60 and p[0]-p[2]>15
def scan_sep(im,y0,y1,x,label):
    px=im.load(); hits=[]
    for y in range(y0,y1):
        if gold(px[x,y]): hits.append((y,px[x,y]))
    print(' %s colonne x=%d, y=%d..%d : %s'%(label,x,y0,y1,hits))
print('\n-- separateur de tete (colonne au milieu) --')
scan_sep(ref,180,280,560,'REF')
scan_sep(cap,350,520,540,'CAP')
print('\n-- bouton retour : bbox du cercle (bordure #ffffff26 sur fond) --')
def circle_bbox(im,x0,x1,y0,y1,bg,tol,label):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if max(abs(p[i]-bg[i]) for i in range(3))>tol: xs.append(x);ys.append(y)
    if not xs: print(' %s: rien'%label); return None
    print(' %s bbox=(%d,%d,%d,%d) w=%d h=%d'%(label,min(xs),min(ys),max(xs),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1))
    return (min(xs),min(ys),max(xs),max(ys))
# fond de la tete ~ fond feuille + gradient radial ; on echantillonne
print(' ref fond tete (x=30,y=60):',ref.getpixel((30,60)),' cap fond tete (x=30,y=290):',cap.getpixel((30,290)))
circle_bbox(ref,40,190,50,210,ref.getpixel((30,60)),12,'REF retour')
circle_bbox(cap,40,190,270,410,cap.getpixel((30,290)),12,'CAP retour')
