# m17 — geometrie horizontale dans la fiche : pour chaque bande de lignes, groupes de colonnes encrees.
# Controle positif : canon -> .actions 332 CSS de large a x=30 (mesure-canon.txt) => 3 boutons + 2 gouttieres de 9.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
def groupes(px,x0,x1,y0,y1,thr,gap):
    cnt=[0]*(x1-x0)
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(px[x,y])>thr: cnt[x-x0]+=1
    out=[];cur=None;bl=0
    for i,c in enumerate(cnt):
        if c>=1:
            if cur is None: cur=[i,i]
            else: cur[1]=i
            bl=0
        else:
            if cur is not None:
                bl+=1
                if bl>gap: out.append(cur);cur=None
    if cur: out.append(cur)
    return [(a+x0,b+x0) for a,b in out]
CAS=[('canon','../ecran-canon.png',3.0,424.52,[('titre',21.8,33.0),('soustitre',43.5,53.6),('stats_val',70.5,82.6),('stats_lib',91.3,99.6),('boutons',116.3,154.3)]),
     ('fiche19','../capture-fiche-1080x1920.png',2.755,426.50,[('titreL1',7.9,23.0),('titreL2',27.4,39.7),('soustitre',41.6,50.2),('stats_val',68.1,82.9),('stats_lib',89.5,98.1),('boutons',113.5,153.3)])]
for name,f,fac,y0,bands in CAS:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    for lbl,a,b in bands:
        gr=groupes(px,C(14),C(378),C(y0+a),C(y0+b),110,C(5))
        s=' | '.join(f'{p/fac:.1f}-{(q+1)/fac:.1f}' for p,q in gr)
        if gr: print(f'   {lbl:10s} x {gr[0][0]/fac:6.1f}..{(gr[-1][1]+1)/fac:6.1f} (l={(gr[-1][1]+1-gr[0][0])/fac:5.1f})  groupes: {s}')
        else: print(f'   {lbl:10s} rien')
