import sys; sys.path.insert(0,'.')
from lib import *
CAS=[('reference-1080x2102.png', 660, 850, 320),
     ('capture-1080x2400.png',   680, 900, 320),
     ('capture-1080x1920.png',   450, 670, 320)]
for nom,ya,yb,xc in CAS:
    im=ouvrir(nom); px=im.load()
    col=[(y,lum(px[xc,y]),px[xc,y]) for y in range(ya,yb)]
    f=mediane([v for _,v,_ in col])
    print("   colonne x=%d, fond=%.1f" % (xc,f))
    marq=[(y,round(v-f,1),c) for y,v,c in col if v-f>3]
    g=[]
    for y,e,c in marq:
        if g and y-g[-1][-1][0]<=3: g[-1].append((y,e,c))
        else: g.append([(y,e,c)])
    for a in g:
        print("      y=%d..%d  exces max=%.1f  couleur=%s" % (a[0][0],a[-1][0],max(x[1] for x in a), a[len(a)//2][2]))
    print()
