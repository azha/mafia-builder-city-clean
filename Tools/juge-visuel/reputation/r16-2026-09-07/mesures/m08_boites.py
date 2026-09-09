# m08 : bornes des 3 boites de compteur (liseré), dans les 3 images.
import sys; sys.path.insert(0,'.')
from lib import *
CAS=[('reference-1080x2102.png', 690, 830, 745),
     ('capture-1080x2400.png',   700, 880, 770),
     ('capture-1080x1920.png',   470, 650, 537)]
for nom,ya,yb,ymil in CAS:
    im=ouvrir(nom); px=im.load()
    row=[lum(px[x,ymil]) for x in range(0,1080)]
    fond=mediane(row)
    pics=[x for x in range(20,1070) if row[x]-fond>4 and row[x]>=row[x-1] and row[x]>=row[x+1]]
    print("   y=%d fond=%.1f ; colonnes plus claires que le fond (liserés) :" % (ymil,fond))
    g=[]
    for v in pics:
        if g and v-g[-1][-1]<=4: g[-1].append(v)
        else: g.append([v])
    print("      ", [(a[0],a[-1],round(max(row[x] for x in a)-fond,1)) for a in g])
    # bornes verticales de la boite 1 : colonne au milieu de la boite
    col=[lum(px[200,y]) for y in range(ya,yb)]
    f2=mediane(col)
    pv=[y for y in range(ya+2,yb-2) if lum(px[200,y])-f2>4]
    gg=[]
    for v in pv:
        if gg and v-gg[-1][-1]<=4: gg[-1].append(v)
        else: gg.append([v])
    print("   colonne x=200, rangees plus claires :", [(a[0],a[-1]) for a in gg][:6])
    print()
