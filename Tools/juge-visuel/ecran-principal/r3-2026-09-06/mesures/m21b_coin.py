# m21b — carte ASCII du coin haut-gauche du bouton or ('#'=or : r>140 et r-b>55 ; '+'=clair mais pas or)
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
CAS=[('canon','../ecran-canon.png',3.0,424.52+139.0,29.0),('fiche19','../capture-fiche-1080x1920.png',2.755,426.50+138.0,28.0)]
for name,f,fac,ytop,xleft in CAS:
    im=Image.open(f).convert('RGB'); px=im.load(); w,h=im.size
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}  origine ({xleft},{ytop}) CSS, pas = 1 px image')
    for y in range(C(ytop),C(ytop)+int(14*fac)):
        s=''
        for x in range(C(xleft),C(xleft)+int(16*fac)):
            p=px[x,y]
            s+='#' if (p[0]>140 and p[0]-p[2]>55) else ('+' if lum(p)>60 else '.')
        print(f'   y={y/fac:7.2f} |{s}|')
