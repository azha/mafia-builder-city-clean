# m28 — (a) fond du boitier du medaillon ; (b) ecart valeur argent -> anneau du medaillon ;
# (c) bas du panneau fiche a 1080x2400 ; (d) diff pixel entre les deux captures 2400 hors fiche.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
d24=Image.open('../capture-district-1080x2400.png').convert('RGB'); f24=Image.open('../capture-fiche-1080x2400.png').convert('RGB')
print('tailles', d24.size, f24.size)
fac=2.755; C=lambda v:int(round(v*fac))
# (a)
for nm,f,fa,cy in (('canon','../ecran-canon.png',3.0,39.0),('district','../capture-district-1080x2400.png',2.755,40.1)):
    im=Image.open(f).convert('RGB'); px=im.load()
    print(f'   (a) {nm} fond boitier a 3 endroits sans encre :',
          median_win(px,int(178*fa),int((cy+14)*fa),2), median_win(px,int(214*fa),int((cy+14)*fa),2), median_win(px,int(196*fa),int((cy+22)*fa),2))
# (b)
px=d24.load()
print(f'   (b) valeur argent finit a x=149.5 CSS ; anneau du medaillon commence a x=162.6 CSS -> ecart = {162.6-149.5:.1f} CSS')
pxc=Image.open('../ecran-canon.png').convert('RGB').load()
print(f'       canon : valeur finit a 77.3 ; anneau commence a 165.3 -> ecart = {165.3-77.3:.1f} CSS')
# (c)
px=f24.load()
print('   (c) bas du panneau fiche a 2400, colonne x=20 CSS :')
for ycss in [760,762,764,766,768,770,772,774]:
    print(f'      y={ycss} : {median_win(px,C(20),C(ycss),2)}  L={lum(median_win(px,C(20),C(ycss),2)):.1f}')
# (d)
a=d24.load(); b=f24.load(); w,h=d24.size
diff=0; tot=0; zone=0
for y in range(0,h,3):
    for x in range(0,w,3):
        tot+=1
        if 595*fac<=y<=795*fac: zone+=1; continue          # bande de la fiche, exclue
        if a[x,y]!=b[x,y]: diff+=1
print(f'   (d) hors bande fiche (y 595..795 CSS exclue) : {diff} pixels differents sur {tot-zone} echantillonnes ({100.0*diff/(tot-zone):.3f}%)')
