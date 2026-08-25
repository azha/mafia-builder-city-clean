# -*- coding: utf-8 -*-
"""BOUTONS d'action : remplissage (haut/bas = degrade), bordure, rayon,
encre du libelle + hauteur de capitale ; separateurs verticaux de la rangee de stats."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def btn(path,label,yfil,ytop,ybot,spans):
    im=open_img(path); c=css(im); px=im.load()
    print(f"  ===== {label} =====")
    y0=yfil+int(ytop*c); y1=yfil+int(ybot*c)
    for i,(a,b) in enumerate(spans):
        xa,xb=int(a*c),int(b*c)
        xm=(xa+xb)//2
        haut=med_window(im,xm,y0+int(3*c),2); bas=med_window(im,xm,y1-int(3*c),2)
        gauche=med_window(im,xa+int(4*c),(y0+y1)//2,2)
        print(f"    bouton {i+1} x CSS[{a:.1f},{b:.1f}] w={b-a:.2f} : fond haut={hexc(haut)} bas={hexc(bas)} gauche={hexc(gauche)}")
        # bordure : profil horizontal a mi-hauteur
        ym=(y0+y1)//2
        print(f"       bord G :", " ".join(f"{k:+d}:{hexc(px[xa+k,ym])}" for k in range(-2,4)))
        print(f"       bord H :", " ".join(f"{k:+d}:{hexc(px[xm,y0+k])}" for k in range(-2,4)))
        # rayon : ou le bord gauche du bouton apparait, en descendant du haut
        # encre du libelle
        bgb=haut
        pts=[]
        for y in range(y0+int(6*c),y1-int(6*c)):
            for x in range(xa+int(6*c),xb-int(6*c)):
                p=px[x,y]; d=abs(p[0]-bgb[0])+abs(p[1]-bgb[1])+abs(p[2]-bgb[2])
                pts.append((d,p,y))
        pts.sort(key=lambda t:-t[0]); k=max(1,len(pts)//14); top=[t for t in pts[:k]]
        col=(int(statistics.median([t[1][0] for t in top])),int(statistics.median([t[1][1] for t in top])),int(statistics.median([t[1][2] for t in top])))
        ys=[t[2] for t in top]
        print(f"       encre du libelle={hexc(col)}  hauteur d'encre={(max(ys)-min(ys)+1)/c:.2f}CSS")

btn(CANON,'CANON',1280,113.33,153.00,[(29.0,134.3),(143.3,248.7),(257.7,363.0)])
print()
btn(CAP16,'CAP 1080x1920',1172,114.70,154.26,[(29.0,133.6),(142.6,247.2),(256.3,361.1)])
