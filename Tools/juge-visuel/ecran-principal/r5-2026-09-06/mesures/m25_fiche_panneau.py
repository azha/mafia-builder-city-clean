# Grandeur : bbox du panneau .fiche (par son filet laiton du haut et ses bords), + fond du panneau.
# Controle positif : REF doit rendre 366 x 169,19 CSS a (13 ; 424,52) (mesure-canon).
from common import *
def filet_haut(im,y0,y1,x0,x1,scale,label,cible,tol=45):
    px=im.load()
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if all(abs(px[x,y][i]-cible[i])<tol for i in range(3))]
        if len(xs)>50:
            print(f'  {label} filet haut de fiche : y={y} ({y/scale:.2f} CSS) x {min(xs)}..{max(xs)} = {min(xs)/scale:.2f}..{(max(xs)+1)/scale:.2f} CSS (largeur {(max(xs)-min(xs)+1)/scale:.2f}) couleur {px[xs[len(xs)//2],y]}')
            return y,min(xs),max(xs)
    print(f'  {label}: pas de filet'); return None
def bas_panneau(im,x,y0,y1,scale,label,seuil=12):
    px=im.load(); prev=None
    for y in range(y0,y1):
        c=px[x,y]
        if prev and abs(lum(c)-lum(prev))>seuil:
            print(f'  {label} rupture bas a y={y} ({y/scale:.2f} CSS) : {prev} -> {c}')
        prev=c
r=op(REF)
f=filet_haut(r,1260,1300,100,1100,REF_S,'REF',(176,141,62))
print('   attendu : y=426.67 CSS (r3 g19), x 13..379 CSS')
bas_panneau(r,600,1760,1800,REF_S,'REF')
c=op(C19)
f2=filet_haut(c,1100,1160,60,1020,CAP_S,'CAP1920',(200,126,66))
f3=filet_haut(c,1100,1160,60,1020,CAP_S,'CAP1920 (cible laiton)',(176,141,62))
bas_panneau(c,540,1540,1580,CAP_S,'CAP1920')
