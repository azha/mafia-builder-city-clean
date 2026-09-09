# m25 — structure verticale : ou l'art s'arrete-t-il et ou commence le panneau de fond declare ?
# Critere : dispersion horizontale (max-min de L sur la ligne, hors chrome) ; une bande UNIE a une
# dispersion tres faible. Controle NEGATIF : au milieu de l'art la dispersion doit etre grande.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('district','../capture-district-1080x2400.png',2.755),('fiche19','../capture-fiche-1080x1920.png',2.755),
   ('fiche24','../capture-fiche-1080x2400.png',2.755),('canon','../ecran-canon.png',3.0)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h} ({h/fac:.1f} CSS de haut)')
    prev=None
    for y in range(0,h,int(2*fac)):
        L=[lum(px[x,y]) for x in range(int(w*0.05),int(w*0.95),3)]
        d=max(L)-min(L)
        tag='UNI ' if d<8 else ('    ' if d<40 else 'ART ')
        if prev!=tag:
            print(f'   y={y/fac:7.1f} CSS -> {tag} (dispersion={d:.0f}, L median={med(L):.0f}, couleur {median_win(px,w//2,y,2)})')
            prev=tag
    print(f'   [ctrl neg] milieu de l\'art y={h//2/fac:.0f} : dispersion={max(lum(px[x,h//2]) for x in range(50,w-50))-min(lum(px[x,h//2]) for x in range(50,w-50)):.0f}')
