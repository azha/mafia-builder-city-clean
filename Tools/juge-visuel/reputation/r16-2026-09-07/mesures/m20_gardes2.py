# m20 : gardes internes (hors frange du rail) + bornes des panneaux.
import sys; sys.path.insert(0,'.')
from lib import *

def scan(nom, rail_int_haut, rail_int_bas, xa, xb):
    im=ouvrir(nom); px=im.load()
    def encree(y):
        row=[lum(px[x,y]) for x in range(xa,xb)]
        m=mediane(row)
        return sum(1 for v in row if abs(v-m)>4)>10
    p=None
    for y in range(rail_int_haut+4, rail_int_haut+220):
        if encree(y): p=y; break
    d=None
    for y in range(rail_int_bas-4, rail_int_bas-500, -1):
        if encree(y): d=y; break
    print("   1er contenu y=%s (garde haut = %d px = %.2f CSS) | dernier contenu y=%s (garde bas = %d px = %.2f CSS)"
          % (p, p-rail_int_haut-1, (p-rail_int_haut-1)/3.6, d, rail_int_bas-d-1, (rail_int_bas-d-1)/3.6))
    print("   VIDE total dans le cadre = %d px = %.2f CSS" % ((p-rail_int_haut-1)+(rail_int_bas-d-1), ((p-rail_int_haut-1)+(rail_int_bas-d-1))/3.6))
    return p,d

print("REF   :"); scan('reference-1080x2102.png',454,2076,32,1048)
print("2400  :"); scan('capture-1080x2400.png',485,2106,29,1050)
print("1920  :"); scan('capture-1080x1920.png',253,1626,29,1050)

print("\n### bornes verticales des grands blocs (sonde x juste dans le bord droit du panneau) ###")
def bornes(nom,xs,ya,yb,etiq):
    im=Image.open(DOSSIER+'/'+nom).convert('RGB'); px=im.load()
    col=[(y,lum(px[xs,y])) for y in range(ya,yb)]
    f=mediane([v for _,v in col])
    marq=[y for y,v in col if v-f>2]
    g=[]
    for y in marq:
        if g and y-g[-1][-1]<=3: g[-1].append(y)
        else: g.append([y])
    print("   %-28s x=%d fond=%.1f -> %s" % (etiq,xs,f,[(a[0],a[-1]) for a in g]))
bornes('reference-1080x2102.png',1020,830,1600,'ref  panneau elastique')
bornes('capture-1080x2400.png',1020,850,1660,'2400 panneau elastique')
bornes('capture-1080x1920.png',1020,618,1420,'1920 panneau elastique')
