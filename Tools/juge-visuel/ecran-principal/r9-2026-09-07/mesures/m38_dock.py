# m38 — dock : profil de lignes dans le bas de l'ecran, ronds, indicateur d'onglet, libelles.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m38 dock ===')
def profil(px,W,y0,y1,sc,nom,x0=0,x1=None):
    x1=x1 or W
    print('   [%s] lignes avec de l\'encre claire (L>0,10) :'%nom)
    seq=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(px[x,y])>0.10)
        seq.append((y,n))
    cur=None
    for y,n in seq:
        if n>0:
            if cur is None: cur=[y,y,n]
            else: cur[1]=y; cur[2]=max(cur[2],n)
        else:
            if cur: print('      y %4d..%4d (%7.2f..%7.2f CSS) h=%2d  max %d px'%(cur[0],cur[1],cur[0]/sc,cur[1]/sc,cur[1]-cur[0]+1,cur[2])); cur=None
    if cur: print('      y %4d..%4d (%7.2f..%7.2f CSS) h=%2d  max %d px'%(cur[0],cur[1],cur[0]/sc,cur[1]/sc,cur[1]-cur[0]+1,cur[2]))
imc=ouvrir(CANON,'canon'); pc=imc.load()
imd=ouvrir(DIST,'district2400'); pd=imd.load()
imf=ouvrir(F1920,'fiche1920'); pf=imf.load()
profil(pc,1176,1930,2091,SC_CANON,'canon')
profil(pd,1080,2240,2400,SC_CAPT,'jeu 2400')
profil(pf,1080,1760,1920,SC_CAPT,'jeu 1920')
