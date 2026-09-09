# m2 — bornes de la FEUILLE (panneau de contenu) sur la capture + fond de feuille des deux cotes.
# Controle positif : largeur de la reference = 1120 (connu). Controle negatif : le fond HORS feuille
# de la capture (11,11,11) doit differer du fond DANS la feuille.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF',ref.size,'CAP',cap.size)
W,H=cap.size
# ligne calme : y=1800 (entre deux rangs, aplat)
for y in (1420,1800,2100):
    row=[cap.getpixel((x,y)) for x in range(W)]
    x0=next(x for x in range(W) if row[x]!=(11,11,11))
    x1=next(x for x in range(W-1,-1,-1) if row[x]!=(11,11,11))
    print(f'y={y}: premier px != (11,11,11) a x={x0} {row[x0]}, dernier a x={x1} {row[x1]}')
    # transition fine
    print('   gauche', [(x,row[x]) for x in range(x0-2,x0+6)])
    print('   droite', [(x,row[x]) for x in range(x1-5,min(W,x1+3))])
# fond de feuille (mediane d'une fenetre calme)
def med(im,x0,y0,x1,y1):
    px=im.load(); r=[];g=[];b=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; r.append(c[0]); g.append(c[1]); b.append(c[2])
    r.sort();g.sort();b.sort(); n=len(r)//2
    return (r[n],g[n],b[n])
print('\nfond feuille CAPTURE (x 40..120, y 2080..2130):', med(cap,40,2080,120,2130))
print('fond feuille REFERENCE (x 20..80, y 1780..1830):', med(ref,20,1780,80,1830))
print('fond feuille REFERENCE (x 1050..1110, y 1780..1830):', med(ref,1050,1780,1110,1830))
print('fond HORS feuille CAPTURE (x 0..6, y 1000..1100):', med(cap,0,1000,6,1100))
