# m15 : ecart vertical entre le bas du CHIFFRE (cyan) et le haut du LIBELLE (creme), par compteur.
import sys; sys.path.insert(0,'.')
from lib import *
CYAN=(127,212,217); CREME=(234,224,200)
def c_cyan(c,t=28): return all(abs(c[i]-CYAN[i])<=t for i in range(3))
def c_clair(c): return lum(c)>70 and abs(c[0]-c[2])<60 and not c_cyan(c)
CAS=[('reference-1080x2102.png',[(56,356),(390,690),(724,1024)],700,815),
     ('capture-1080x2400.png',  [(52,354),(388,690),(722,1028)],731,838),
     ('capture-1080x1920.png',  [(52,354),(388,690),(722,1028)],499,606)]
for nom,boites,ya,yb in CAS:
    im=ouvrir(nom); px=im.load()
    for k,(bx0,bx1) in enumerate(boites,1):
        bas=None
        for y in range(ya,yb):
            if any(c_cyan(px[x,y]) for x in range(bx0,bx1+1)): bas=y
        haut=None
        if bas:
            for y in range(bas+4,yb):
                if sum(1 for x in range(bx0,bx1+1) if c_clair(px[x,y]))>=6: haut=y; break
        print("   compteur %d : bas cyan y=%s | haut libelle y=%s | ECART=%s px" % (k,bas,haut, (haut-bas-1) if (haut and bas) else '?'))
    print()
