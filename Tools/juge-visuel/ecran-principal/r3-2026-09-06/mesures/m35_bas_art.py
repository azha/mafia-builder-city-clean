# m35 — bord BAS de l'art a 1080x2400 : ou la dispersion horizontale s'effondre-t-elle ?
# Attendu si l'art 1080x1920 est centre : 240 px en haut (=87.1 CSS) et 240 px en bas
# => bas de l'art a y = 2160 px = 784.0 CSS. Controle positif : le bord HAUT mesure doit valoir 240 px.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
im=Image.open('../capture-district-1080x2400.png').convert('RGB'); px=im.load(); w,h=im.size
print('taille', im.size)
for lbl,rng in (('bord haut (px)',range(228,252)),('bord bas (px)',range(2148,2172))):
    print(f'   {lbl} : y px (y CSS) : couleur mediane de ligne / dispersion')
    for y in rng:
        V=[px[x,y] for x in range(60,w-60,3)]
        L=[lum(v) for v in V]
        print(f'      {y:5d} ({y/2.755:6.1f}) : ({med([v[0] for v in V]):3.0f},{med([v[1] for v in V]):3.0f},{med([v[2] for v in V]):3.0f})  disp={max(L)-min(L):5.1f}')
