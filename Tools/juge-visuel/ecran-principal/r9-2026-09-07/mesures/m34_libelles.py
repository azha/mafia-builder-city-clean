# m34 — libelles de type sous chaque marqueur : bbox d'encre, hauteur de capitale, contraste local.
# Controle positif : le libelle du dock (canon 8,5px) mesure avec le MEME instrument, pour l'echelle.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m34 libelles de type de la vue district ===')
im=ouvrir(DIST,'district2400'); px=im.load(); W,H=im.size
M=[(490,783),(803,855),(296,883),(905,911),(576,946),(305,947),(136,1027),(587,1102),(149,1222),(723,1480),(148,1496)]
def clair(c): return c[0]>150 and c[1]>150 and c[2]>145 and max(c)-min(c)<40
for i,(mx,my) in enumerate(M):
    # bande du libelle : 8..24 px sous le centre, +-70 px
    pts=[(x,y) for y in range(my+7,my+26) for x in range(max(0,mx-75),min(W,mx+76)) if clair(px[x,y])]
    if not pts: print('   B%02d : AUCUN libelle detecte'%(i+1)); continue
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    # fond local sous/autour du texte
    fond=medrgb(px, max(0,mx-75), my+28, min(W,mx+76), my+34)
    enc=tuple(int(med([px[x,y][k] for x,y in pts])) for k in range(3))
    # contraste au fond IMMEDIAT (anneau de 2 px autour de l'encre)
    S=set(pts); voisins=[]
    for x,y in pts:
        for dx in range(-3,4):
            for dy in range(-3,4):
                q=(x+dx,y+dy)
                if q not in S and 0<=q[0]<W and 0<=q[1]<H: voisins.append(px[q[0],q[1]])
    fv=tuple(int(med([c[k] for c in voisins])) for k in range(3))
    print('   B%02d (%4d,%4d) : %4d px d\'encre ; x %4d..%4d (%5.2f CSS) ; y %4d..%4d (hauteur %5.2f CSS) ; encre %s ; fond immediat %s ; contraste %5.2f:1 ; fond sous le texte %s'
          % (i+1,mx,my,len(pts),min(xs),max(xs),(max(xs)-min(xs)+1)/SC_CAPT,min(ys),max(ys),(max(ys)-min(ys)+1)/SC_CAPT,
             str(enc),str(fv),contraste(enc,fv),str(tuple(int(v) for v in fond))))
print()
print('   CONTROLE D\'ECHELLE avec le meme instrument : libelle du dock (canon .dockb = 8,5px)')
ic=ouvrir(CANON,'canon'); pc=ic.load()
pts=[(x,y) for y in range(int(657*SC_CANON/SC_CANON*0)+1970, 1990) for x in range(280,420) if clair(pc[x,y])]
print('   (dock canon) %d px' % len(pts))
