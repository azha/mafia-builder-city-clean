# m2 — frontiere haute du dock dans la capture : luminance moyenne de la ligne entiere.
from PIL import Image
cap = Image.open('../capture-1080x2400.png').convert('RGB')
print('OUVERT capture', cap.size)
def rowmean(im,y):
    px=list(im.crop((0,y,im.width,y+1)).getdata())
    return sum(sum(p) for p in px)/(3*len(px))
prev=None
print('--- moyenne de ligne, y 2050..2400 (pas 1), transitions > 0.6 ---')
for y in range(2050,2400):
    m=rowmean(cap,y)
    if prev is not None and abs(m-prev)>0.6:
        print('  y=%4d  moy=%.2f  (prev %.2f)'%(y,m,prev))
    prev=m
print('--- valeurs de reperage ---')
for y in [2050,2100,2150,2180,2200,2220,2250,2300,2330,2350,2380,2399]:
    print('  y=%4d moy=%.2f'%(y,rowmean(cap,y)))
