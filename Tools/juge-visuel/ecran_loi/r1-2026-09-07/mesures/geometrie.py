# Geometrie: profils de lignes pour situer bandeau / contenu / dock.
# Controle positif : les deux images doivent faire 1080 de large (echelle x3,6 des deux cotes).
# Controle negatif : les hauteurs doivent DIFFERER (2102 vs 2400).
from PIL import Image
import statistics as st

def med_row(im, y, x0=0, x1=None):
    w,h = im.size
    x1 = w if x1 is None else x1
    px = im.load()
    r=[];g=[];b=[]
    for x in range(x0,x1,3):
        p=px[x,y]; r.append(p[0]); g.append(p[1]); b.append(p[2])
    return (st.median(r), st.median(g), st.median(b))

def lum(c):
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

for name in ['../reference-1080x2102.png','../capture-1080x2400.png']:
    im = Image.open(name).convert('RGB')
    print('=== %s  taille=%s' % (name, im.size))
    w,h = im.size
    prev=None
    print('  y : mediane RGB de la ligne (pas de 1) - ruptures > 6 de luminance')
    ruptures=[]
    prof=[]
    for y in range(0,h):
        c = med_row(im,y)
        prof.append(c)
    for y in range(1,h):
        d = abs(lum(prof[y])-lum(prof[y-1]))
        if d > 6:
            ruptures.append((y, prof[y-1], prof[y], round(d,1)))
    print('  ruptures de mediane de ligne (|dL|>6) : %d' % len(ruptures))
    for r in ruptures[:60]:
        print('   y=%4d  %s -> %s  dL=%s' % r)
    open('prof_%s.txt' % name.split('/')[-1].split('.')[0], 'w').write(
        '\n'.join('%d %d %d %d' % (y,c[0],c[1],c[2]) for y,c in enumerate(prof)))
