# Situe le dock et le bandeau de la CAPTURE (max de luminance par ligne, pas la mediane :
# le dock est fait de ronds sombres + libelles clairs, invisibles a la mediane).
# Controle positif : la ligne du filet braise (y=141..143) doit ressortir en max.
# Controle negatif : une bande de fond nu (y=1600) doit rendre un max proche du fond.
from PIL import Image
im = Image.open('../capture-1080x2400.png').convert('RGB'); print('capture', im.size)
px = im.load(); w,h = im.size
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
rows=[]
for y in range(h):
    m=0; mc=None
    for x in range(0,w,2):
        c=px[x,y]; l=lum(c)
        if l>m: m=l; mc=c
    rows.append((m,mc))
print('controle positif  y=142 max=%.1f %s' % (rows[142][0], rows[142][1]))
print('controle negatif  y=1600 max=%.1f %s' % (rows[1600][0], rows[1600][1]))
# bandes ou il y a de l'encre (max > fond+12)
fond = 13
runs=[]; cur=None
for y in range(h):
    if rows[y][0] > fond+12:
        if cur is None: cur=y
    else:
        if cur is not None: runs.append((cur,y-1)); cur=None
if cur is not None: runs.append((cur,h-1))
print('bandes d encre (max de ligne > 25) :')
for a,b in runs:
    print('  y %4d..%4d  (h=%3d)  maxL=%.0f' % (a,b,b-a+1, max(rows[y][0] for y in range(a,b+1))))
