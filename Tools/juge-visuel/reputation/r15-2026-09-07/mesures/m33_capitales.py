"""m33 — hauteur de CAPITALE mesuree sur la PREMIERE lettre (colonne la plus a gauche du bloc),
pour ne pas compter les accents ni les jambages.
Controle positif : « Le miroir » (L capitale) doit rendre la meme valeur dans les deux images
                   si la taille est conservee.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def cap(im,x0,x1,y0,y1,largeur=34):
    p=im.load()
    fond=mediane([lum(p[x,y]) for y in range(y0,y1+1) for x in range(x0,x1+1,2)])
    pic=max(lum(p[x,y]) for y in range(y0,y1+1) for x in range(x0,x1+1))
    s=fond+(pic-fond)*0.5
    xs=[x for x in range(x0,x1+1) if any(lum(p[x,y])>=s for y in range(y0,y1+1))]
    a=xs[0]; b=min(a+largeur,x1)
    ys=[y for y in range(y0,y1+1) if any(lum(p[x,y])>=s for x in range(a,b+1))]
    return ys[0],ys[-1],ys[-1]-ys[0]+1,a
R=ouvrir('reference-1080x2102.png'); J=ouvrir('capture-1080x2400.png')
for lab,(im,x0,x1,y0,y1,w) in (
  ("REF « Le miroir » (L)",(R,300,780,505,570,40)),
  ("JEU « Le miroir » (L)",(J,300,780,538,600,40)),
  ("REF « Rien n'a… » (R)",(R,80,720,1715,1770,34)),
  ("JEU « Rien n'a… » (R)",(J,75,700,1650,1700,34)),
  ("REF CTA « D »",(R,225,860,1978,2015,26)),
  ("JEU CTA « D »",(J,225,860,1902,1945,26)),
  ("REF sur-titre « P »",(R,85,690,1675,1700,18)),
  ("JEU sur-titre « P »",(J,80,690,1610,1636,18)),
):
    a,b,h,x=cap(im,x0,x1,y0,y1,w)
    print(f"  {lab:26s} : y{a}..{b}  hauteur de capitale = {h} px  (1re colonne x={x})")
