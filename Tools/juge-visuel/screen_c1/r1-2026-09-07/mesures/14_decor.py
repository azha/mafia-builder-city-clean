#!/usr/bin/env python3
"""Y a-t-il un DECOR (art de ville) dans la bande entre le bandeau et le panneau ?
Un decor a de la STRUCTURE : ecart-type de luminance eleve et beaucoup de teintes.
Un aplat en a zero. Controle positif : la bande de decor de la REFERENCE.
Controle negatif : l'interieur d'une carte (aplat) doit rendre ~0."""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def struct(f,x0,x1,y0,y1,nom):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    vals=[];cols=set()
    for y in range(y0,y1,2):
        for x in range(x0,x1,2):
            p=px[x,y]; vals.append(lum(p)); cols.add(p)
    sd=statistics.pstdev(vals); mo=statistics.mean(vals)
    print(f"  [{f[:26]:26s} {W}x{H}] {nom:38s} y{y0}..{y1}  L_moy={mo:6.2f}  "
          f"ecart-type={sd:6.2f}  teintes distinctes={len(cols):5d}")
    return sd,len(cols)

print("=== bande ENTRE le bandeau et le panneau ===")
sd_ref,_=struct('reference-1080x2102.png',40,1040,200,425,'REFERENCE (sous .barre, sur .jrn6)')
struct('capture-1080x2400.png',40,1040,150,265,'CAPTURE sous chrome')
struct('capture-ecran-seul-1080x2400.png',40,1040,60,265,'CAPTURE ecran seul')
print()
print("=== controles ===")
sd_neg,n_neg=struct('capture-1080x2400.png',200,900,780,830,'CTRL NEGATIF interieur de carte (aplat)')
print(f"  CONTROLE POSITIF reference ecart-type={sd_ref:.2f} (attendu >4) -> {'OK' if sd_ref>4 else 'ECHEC'}")
print(f"  CONTROLE NEGATIF aplat ecart-type={sd_neg:.2f} teintes={n_neg} (attendu <2 et <5) -> "
      f"{'OK' if sd_neg<2 and n_neg<5 else 'ECHEC'}")
print()
print("=== fond du panneau : degrade (reference) ou aplat (capture) ? ===")
for f,x,ys,nom in [('reference-1080x2102.png',540,[460,700,900,1600,1880,2060],'REFERENCE .jrn6'),
                   ('capture-1080x2400.png',540,[160,300,470,660,1600,1770,2100],'CAPTURE')]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    print(f"  [{f[:26]:26s} {W}x{H}] {nom} x={x} : " +
          "  ".join(f"y{y}={px[x,y]}" for y in ys))
