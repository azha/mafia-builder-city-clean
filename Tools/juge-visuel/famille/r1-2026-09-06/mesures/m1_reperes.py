# m1 — repères : bbox de la feuille sur la capture, bbox de l'encre sur la référence, facteur d'échelle.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT reference-1120.png',ref.size,'| capture-1080x2400.png',cap.size)

def med(im,x0,y0,x1,y1):
    px=im.load(); vals=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): vals[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in vals)

print('\n--- CAPTURE : recherche des bords verticaux de la feuille ---')
px=cap.load()
for y in (700, 1250, 1900):
    row=[px[x,y] for x in range(cap.size[0])]
    # bord gauche : premier x ou la couleur change franchement depuis le bord
    print(' y=%d : x=0..20 ->'%y, [row[x] for x in range(0,20)])
    print(' y=%d : x=1060..1079 ->'%y, [row[x] for x in range(1060,1080)])

print('\n--- CAPTURE : couleur de fond hors feuille vs dans feuille ---')
print(' hors-gauche  (x 2..10, y 700..1900):', med(cap,2,700,11,1900))
print(' dans-feuille (x 20..40, y 1700..1900):', med(cap,20,1700,41,1900))
print('\n--- REFERENCE : fond .sheet ---')
print(' ref fond (x 5..25, y 1700..1800):', med(ref,5,1700,26,1800))
print(' ref bord gauche y=1700:', [ref.getpixel((x,1700)) for x in range(0,8)])
print(' ref bord droit  y=1700:', [ref.getpixel((x,1700)) for x in range(1112,1120)])
