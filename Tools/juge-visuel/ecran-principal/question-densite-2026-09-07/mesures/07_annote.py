#!/usr/bin/env python3
"""07 - Rend la classification VISIBLE. Une classification qu'on ne regarde pas
est une classification qu'on ne connait pas."""
from PIL import Image, ImageFilter, ImageChops, ImageDraw
import os
D=os.path.dirname(__file__)
src=Image.open(os.path.join(D,'..','capture-nuit-1080x1920.png')).convert('RGB')
W,H=src.size; p=src.load(); print("taille source : %d x %d"%(W,H))
Y0,Y1,B=142,1684,24
L=src.convert('L')
amp=ImageChops.subtract(L.filter(ImageFilter.MaxFilter(9)),L.filter(ImageFilter.MinFilter(9))); pa=amp.load()
def is_eau(r,g,b): return (g-r)>=30 and (b-r)>=45
def overlay(x,y):
    return (228<=y<=266) or ((x-540)**2+(y-97)**2<=92*92) or (abs(x-540)<12 and 214<=y<=232)
bat=set()
for by in range(Y0,Y1,B):
    for bx in range(0,W,B):
        n=h=e=0
        for x in range(bx,min(bx+B,W)):
            for y in range(by,min(by+B,Y1)):
                n+=1
                if pa[x,y]>=12: h+=1
                if is_eau(*p[x,y]): e+=1
        if n and e/n<0.5 and h/n>=0.60: bat.add((bx,by))
out=src.copy(); po=out.load()
for y in range(H):
    for x in range(W):
        r,g,b=p[x,y]
        if y<Y0 or y>=Y1: c=(90,90,90)                      # chrome
        elif overlay(x,y): c=(140,140,140)                  # overlay de chrome
        elif is_eau(r,g,b): c=(20,90,200)                   # eau
        elif ((x//B)*B,((y-Y0)//B)*B+Y0) in bat: c=(230,60,40)   # bati
        else: c=(250,220,60)                                # sol nu
        po[x,y]=(int(r*.42+c[0]*.58),int(g*.42+c[1]*.58),int(b*.42+c[2]*.58))
d=ImageDraw.Draw(out)
for yy,lab in ((Y0,'y=142 bas du bandeau'),(462,'y=462 debut du bati'),(1462,'y=1462 fin du bati'),(Y1,'y=1684 haut du dock')):
    d.line([0,yy,W,yy],fill=(255,255,255),width=3); d.text((8,yy+6),lab,fill=(255,255,255))
d.text((8,H-30),"rouge=BATI  jaune=SOL NU  bleu=EAU  gris=CHROME",fill=(255,255,255))
out.save(os.path.join(D,'07_classification.png'))
out.resize((540,960)).save(os.path.join(D,'07_classification_petit.png'))
print("ecrit 07_classification.png")
