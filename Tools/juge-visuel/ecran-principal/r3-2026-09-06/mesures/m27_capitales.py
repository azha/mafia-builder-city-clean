# m27 — hauteurs de CAPITALE mesurees sur une lettre capitale isolee (pas sur la bande entiere,
# qui melange accents et jambages). Chaque fenetre est donnee en CSS et verifiee par la largeur d'encre.
# Controle positif : le libelle de dock doit rendre ~6.0 CSS des deux cotes (font-size 8.5px).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
def cap(px,fac,x0,x1,y0,y1,thr=110):
    C=lambda v:int(round(v*fac))
    ys=[y for y in range(C(y0),C(y1)) for x in range(C(x0),C(x1)) if lum(px[x,y])>thr]
    xs=[x for y in range(C(y0),C(y1)) for x in range(C(x0),C(x1)) if lum(px[x,y])>thr]
    if not ys: return None
    return (min(ys)/fac,(max(ys)+1)/fac,(max(ys)+1-min(ys))/fac,min(xs)/fac,(max(xs)+1)/fac)
CAS=[('canon','../ecran-canon.png',3.0,{
        'val_argent (chiffre 2)':(30,40,20,39),
        'val_droite (2 de 21:40)':(341,352,24,38),
        'titre fiche (L de LE)'  :(124,136,444,460),
        'soustitre (B de BAR)'   :(122,134,466,480),
        'stat2 ($ de 180/h)'     :(174,182,493,509),
        'btn BLANCHIR (B)'       :(161,172,548,566),
        'dock EMPIRE (E)'        :(75,84,669,679),
        'medaillon 37% (3)'      :(185,195,462,481)}),
     ('fiche19','../capture-fiche-1080x1920.png',2.755,{
        'val_argent (chiffre 4)':(64,74,22,40),
        'val_droite (N de Nuit)':(345,357,24,38),
        'titre fiche (S)'        :(33,46,432,452),
        'soustitre (O de OPER)'  :(152,163,466,478),
        'stat2 (C de Coupee)'    :(168,181,493,510),
        'btn BLANCHIR (B)'       :(158,169,548,568),
        'dock EMPIRE (E)'        :(75,84,667,678),
        'medaillon (B de Brulant)':(177,189,42,52)})]
for name,f,fac,W in CAS:
    im=Image.open(f).convert('RGB'); px=im.load(); print(f'== {name} {im.size}')
    for k,(a,b,c,d) in W.items():
        r=cap(px,fac,a,b,c,d)
        print(f'   {k:26s} : ' + (f'y {r[0]:7.2f}..{r[1]:7.2f}  CAP={r[2]:5.2f} CSS  (encre x {r[3]:.1f}..{r[4]:.1f})' if r else 'RIEN'))
