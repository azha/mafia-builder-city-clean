# m19 : gardes internes du cadre + panneau elastique + debord de la carte portrait.
# Controle positif : la largeur rail-a-rail du cadre (identique attendue entre les 2 planches).
import sys; sys.path.insert(0,'.')
from lib import *

def premiere_encre(px,W,ya,yb,xa,xb,marge=4):
    for y in range(ya,yb):
        row=[lum(px[x,y]) for x in range(xa,xb)]
        m=mediane(row)
        if sum(1 for v in row if abs(v-m)>marge)>10: return y
    return None
def derniere_encre(px,W,ya,yb,xa,xb,marge=4):
    for y in range(yb-1,ya,-1):
        row=[lum(px[x,y]) for x in range(xa,xb)]
        m=mediane(row)
        if sum(1 for v in row if abs(v-m)>marge)>10: return y
    return None

CAS=[('reference-1080x2102.png',(452,454),(2076,2078),(24,1056)),
     ('capture-1080x2400.png',  (482,485),(2106,2109),(21,1058)),
     ('capture-1080x1920.png',  (250,253),(1626,1629),(21,1058))]
for nom,(ha,hb),(ba,bb),(xa,xb) in CAS:
    im=ouvrir(nom); px=im.load(); W,H=im.size
    p=premiere_encre(px,W,hb+1,hb+200,xa,xb)
    d=derniere_encre(px,W,ba-400,ba,xa,xb)
    print("   rail haut int=%d  rail bas int=%d  |  1er contenu y=%s (garde haut=%s px)  dernier contenu y=%s (garde bas=%s px)"
          % (hb,ba,p,p-hb-1 if p else '?',d,ba-d-1 if d else '?'))
    print("   VIDE total dans le cadre = %s px = %.2f CSS" % ((p-hb-1)+(ba-d-1), ((p-hb-1)+(ba-d-1))/3.6))
    print("   largeur rail a rail = %d px" % (xb-xa+1+2*3-6+0))
    print()

print("### panneau elastique (le grand panneau qui contient la carte portrait + les tuiles) ###")
# bornes : trait clair horizontal a gauche/droite du panneau
def bornes_panneau(nom, ya, yb, xsonde):
    im=ouvrir(nom); px=im.load()
    col=[(y,lum(px[xsonde,y])) for y in range(ya,yb)]
    f=mediane([v for _,v in col])
    marq=[y for y,v in col if v-f>2.5]
    g=[]
    for y in marq:
        if g and y-g[-1][-1]<=3: g[-1].append(y)
        else: g.append([y])
    return [(a[0],a[-1]) for a in g]
print("   ref  (x=1040) :", bornes_panneau('reference-1080x2102.png',800,1560,1040))
print("   2400 (x=1043) :", bornes_panneau('capture-1080x2400.png',830,1620,1043))
print("   1920 (x=1043) :", bornes_panneau('capture-1080x1920.png',598,1390,1043))
