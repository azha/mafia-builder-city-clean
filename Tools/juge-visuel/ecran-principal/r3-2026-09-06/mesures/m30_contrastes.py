# m30 — contrastes des textes sur leur fond REEL (echantillonne a >=3 px de tout bord).
# Controle positif : sur le canon, le libelle de stat (creme-2 sur panneau) doit valoir ~7-8:1.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
def txt_bg(px,fac,x0,x1,y0,y1,tthr=140,bthr=60):
    C=lambda v:int(round(v*fac))
    P=[px[x,y] for y in range(C(y0),C(y1)) for x in range(C(x0),C(x1)) if lum(px[x,y])>tthr]
    Q=[px[x,y] for y in range(C(y0-3),C(y1+3)) for x in range(C(x0-4),C(x1+4)) if lum(px[x,y])<bthr]
    if not P or not Q: return None
    P.sort(key=lum); core=P[int(len(P)*0.8):]
    t=(med([p[0] for p in core]),med([p[1] for p in core]),med([p[2] for p in core]))
    b=(med([p[0] for p in Q]),med([p[1] for p in Q]),med([p[2] for p in Q]))
    return t,b,contrast(t,b)
CAS=[('canon','../ecran-canon.png',3.0,{
      'ARGENT (libelle)':(17,58,10,18),'valeur argent':(17,78,21,35),'JOUR 12 (libelle)':(278,374,14,22),
      'valeur droite':(341,376,25,36),'titre fiche':(124,266,445,458),'sous-titre fiche':(122,269,469,478),
      'stat3 (12%)':(295,321,494,508),'libelle stat':(51,116,493+0,500+0)}),
     ('fiche19','../capture-fiche-1080x1920.png',2.755,{
      'ARGENT (libelle)':(64,103,10,17),'valeur argent':(64,150,25,37),'JOUR 37 (libelle)':(341,376,10,18),
      'valeur droite':(345,376,25,36),'titre fiche':(33,360,434,449),'sous-titre fiche':(152,240,468,477),
      'stat3 (Endommage)':(261,351,494,507),'libelle stat':(64,105,517,524)})]
for name,f,fac,W in CAS:
    im=Image.open(f).convert('RGB'); px=im.load(); print(f'== {name} {im.size}')
    for k,(a,b,c,d) in W.items():
        r=txt_bg(px,fac,a,b,c,d)
        print(f'   {k:20s} : ' + (f'texte {r[0]} sur {r[1]} -> {r[2]:.2f}:1' if r else 'RIEN'))
