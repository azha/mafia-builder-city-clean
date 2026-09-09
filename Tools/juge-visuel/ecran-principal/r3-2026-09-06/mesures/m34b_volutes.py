# m34b — volutes : fenetres NETTOYEES de tout texte. gauche x 4..16 CSS ; droite x 376..390 CSS.
# Controle positif : le canon doit avoir de l'encre des deux cotes (les deux volutes existent).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755),
   ('fiche19','../capture-fiche-1080x1920.png',2.755)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); px=im.load(); w,h=im.size
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    for lbl,(a,b) in {'volute gauche (x 4..16)':(4,16),'volute droite (x 376..390)':(376,390)}.items():
        vals=[(lum(px[x,y]),x,y) for y in range(C(16),C(38)) for x in range(C(a),min(w,C(b)))]
        base=med([v[0] for v in vals]); vals.sort(reverse=True)
        n=sum(1 for v in vals if v[0]>base+10)
        print(f'   {lbl:28s}: fond L={base:.1f} ; n(L>fond+10)={n}/{len(vals)} ; max={vals[0][0]:.0f} a ({vals[0][1]/fac:.1f},{vals[0][2]/fac:.1f})')
