import sys; sys.path.insert(0,'.')
from lib import *
from PIL import Image
print('stat3 canon  (224,102,74) sur (13,20,33) ->', f'{contrast((224,102,74),(13,20,33)):.2f}:1')
print('stat3 jeu    (255, 90,77) sur (12,19,31) ->', f'{contrast((255,90,77),(12,19,31)):.2f}:1')
print('delta par canal jeu-canon :', (255-224,90-102,77-74))
# "CHALEUR" seule : bande y 58..66 CSS, x 176..218
im=Image.open('../capture-fiche-1080x1920.png').convert('RGB'); px=im.load(); fac=2.755
C=lambda v:int(round(v*fac))
xs=[];ys=[]
for y in range(C(56),C(70)):
    for x in range(C(174),C(220)):
        if lum(px[x,y])>120: xs.append(x);ys.append(y)
print(f'CHALEUR bbox x {min(xs)/fac:.1f}..{(max(xs)+1)/fac:.1f} y {min(ys)/fac:.2f}..{(max(ys)+1)/fac:.2f} (l={(max(xs)+1-min(xs))/fac:.1f} h={(max(ys)+1-min(ys))/fac:.2f})')
# canon HEAT
im2=Image.open('../ecran-canon.png').convert('RGB'); p2=im2.load(); f2=3.0
C2=lambda v:int(round(v*f2))
xs=[];ys=[]
for y in range(C2(48),C2(58)):
    for x in range(C2(174),C2(220)):
        if lum(p2[x,y])>120: xs.append(x);ys.append(y)
print(f'HEAT   bbox x {min(xs)/f2:.1f}..{(max(xs)+1)/f2:.1f} y {min(ys)/f2:.2f}..{(max(ys)+1)/f2:.2f} (l={(max(xs)+1-min(xs))/f2:.1f} h={(max(ys)+1-min(ys))/f2:.2f})')
# canon 37% seul (sans l'aiguille) : bande y 40..48
xs=[];ys=[]
for y in range(C2(39),C2(49)):
    for x in range(C2(180),C2(212)):
        if lum(p2[x,y])>150: xs.append(x);ys.append(y)
print(f'37%    bbox x {min(xs)/f2:.1f}..{(max(xs)+1)/f2:.1f} y {min(ys)/f2:.2f}..{(max(ys)+1)/f2:.2f} (l={(max(xs)+1-min(xs))/f2:.1f} h={(max(ys)+1-min(ys))/f2:.2f})')
print('Brulant : voir m29 -> y 44.28..52.63 (h 8.35), x 177.5..215.2 (l 37.7)')
print('contraste Brulant : ', f"{contrast((234,224,200),(18,23,33)):.2f}:1", ' | canon 37% :', f"{contrast((234,224,200),(18,26,40)):.2f}:1")
