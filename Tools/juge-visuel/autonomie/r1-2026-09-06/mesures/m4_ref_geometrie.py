# m4 — geometrie de la REFERENCE : bandeau evoque, contenu, bas de cadre.
from PIL import Image
ref = Image.open('../reference-1080x2102.png').convert('RGB')
print('OUVERT reference', ref.size)
def rowmean(im,y):
    px=list(im.crop((0,y,im.width,y+1)).getdata())
    return sum(sum(p) for p in px)/(3*len(px))
def med(im,x0,y0,x1,y1):
    px=list(im.crop((x0,y0,x1,y1)).getdata()); n=len(px)
    return tuple(sorted(p[c] for p in px)[n//2] for c in range(3))
print('--- transitions de moyenne de ligne (seuil 2.5) ---')
prev=None
for y in range(0,ref.height):
    m=rowmean(ref,y)
    if prev is not None and abs(m-prev)>2.5:
        print('  y=%4d moy=%.2f (prev %.2f)'%(y,m,prev))
    prev=m
print('--- reperes couleur ---')
for y in [10,120,220,228,232,240,300,360,380,1500,1560,1600,2090,2101]:
    print('  y=%4d med(x 20..120)=%s  moy=%.2f'%(y,med(ref,20,y,120,y+1),rowmean(ref,y)))
