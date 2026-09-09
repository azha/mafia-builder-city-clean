# Grandeur : position + couleur du filet laiton (bas de bandeau) ; ET couleur de l'anneau du medaillon.
# Controle positif : le filet du canon DOIT rendre (176,141,62) = --laiton (grandeur 4 du r3).
from common import *
def profil(im,x,y0,y1,label,scale):
    px=im.load(); print(f'  -- {label} colonne x={x}')
    rows=[]
    for y in range(y0,y1):
        c=px[x,y]; rows.append((y,c,round(lum(c),1)))
    # trouver la bande la plus claire contigue
    best=max(rows,key=lambda r:r[2])
    print(f'     pic L={best[2]} a y={best[0]} c={best[1]}  (CSS y={best[0]/scale:.2f})')
    for y,c,L in rows:
        if L>best[2]*0.55: print(f'       y={y} ({y/scale:6.2f} CSS) {c} L={L}')
    return best
r=op(REF); print('REF (x=200 px = 66.7 CSS), attendu filet ~ y 150-155 px')
profil(r,200,138,168,'REF filet',REF_S)
c=op(C19); print('CAP1920 (x=200 px = 72.6 CSS)')
profil(c,200,130,165,'CAP1920 filet',CAP_S)
c2=op(C24); print('CAP2400 district')
profil(c2,200,130,165,'CAP2400 filet',CAP_S)
t=op(T24); print('TEMOIN famille 2400')
profil(t,200,130,165,'TEMOIN filet',CAP_S)
