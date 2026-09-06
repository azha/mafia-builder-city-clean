# m05 — groupes de colonnes encrees, par bande horizontale de 4 CSS, dans la barre (0..56 CSS).
# Seuil L>150 (le creme #eae0c8 -> L=223 ; l'or #f2c96b -> L=203 ; creme-2 #b9ad92 -> L=174).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
print('controle: L(#eae0c8)=%.0f L(#f2c96b)=%.0f L(#b9ad92)=%.0f L(#d9ab4e)=%.0f'%(
  lum((234,224,200)),lum((242,201,107)),lum((185,173,146)),lum((217,171,78))))
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac))
    print(f'== {name} {w}x{h}')
    for b in range(0,15):
        y0,y1=C(b*4),C(b*4+4)
        cnt=[0]*w
        for y in range(y0,y1):
            for x in range(w):
                if lum(px[x,y])>150: cnt[x]+=1
        gr=[];cur=None;blank=0
        for i,c in enumerate(cnt):
            if c>=1:
                if cur is None: cur=[i,i]
                else: cur[1]=i
                blank=0
            else:
                if cur is not None:
                    blank+=1
                    if blank>C(4): gr.append(cur);cur=None
        if cur: gr.append(cur)
        s=' | '.join(f'{g[0]/fac:.0f}-{g[1]/fac:.0f}' for g in gr)
        print(f'   CSS y {b*4:3d}-{b*4+4:3d} : {s}')
