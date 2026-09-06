# m07 - produit la reference RECALEE dans le repere de la capture 2400 (ref_warp.png)
# et une image de residu. Recalage m06 : s=1.02215, tx=-11.94, ty=+8.17
from PIL import Image, ImageChops
import json
p=json.load(open('recalage.json'))
s,tx,ty=1.02215,-11.94,8.17
print('recalage retenu s=%.5f tx=%.2f ty=%.2f (deux chemins: %s)'%(s,tx,ty,p))
ref=Image.open('../reference-1080x2102.png').convert('RGB')
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB')
print('ref',ref.size,'cap',cap.size)
w=ref.transform(cap.size, Image.AFFINE, (1/s,0,-tx/s, 0,1/s,-ty/s), resample=Image.BICUBIC)
w.save('ref_warp.png')
print('ref_warp.png', w.size)
# bornes du contenu de la reference dans le repere capture
for name,y in [('ref y=0',0),('ref y=219',219),('ref y=2084',2084),('ref y=2101',2101)]:
    print('  %s -> cap y=%.1f'%(name, y*s+ty))
for name,x in [('ref x=0',0),('ref x=1079',1079)]:
    print('  %s -> cap x=%.1f'%(name, x*s+tx))
d=ImageChops.difference(w,cap)
r,g,b=d.split()
m=ImageChops.lighter(ImageChops.lighter(r,g),b)
m.save('residu.png')
print('residu.png ecrit')
