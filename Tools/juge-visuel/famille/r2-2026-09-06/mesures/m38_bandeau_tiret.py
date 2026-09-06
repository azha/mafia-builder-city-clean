# m38 — le TIRET du bloc JOUR du bandeau : bornes de l'objet clair isole sous « JOUR 50 ».
# (Le chrome n'est pas juge ; cette mesure sert seulement a etayer la mention en tete du rapport.)
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); print('CAPTURE',im.size)
px=im.load()
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
print('objets clairs (L>90) dans le quart droit du bandeau, x 700..1080, y 0..135 :')
prev=False
for y in range(0,136):
    xs=[x for x in range(700,1080) if lum(px[x,y])>90]
    on=bool(xs)
    if on and not prev: print(f'  bande a partir de y={y}')
    if on: dernier=(y,xs[0],xs[-1],len(xs))
    if (not on) and prev: print(f'  ... jusqu a y={dernier[0]}  x {dernier[1]}..{dernier[2]}')
    prev=on
if prev: print(f'  ... jusqu a y={dernier[0]}  x {dernier[1]}..{dernier[2]}')
