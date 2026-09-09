# m07b — le "trou" du cadre du bouton : le trait manque-t-il VRAIMENT, ou est-il ailleurs en y ?
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); px=im.load()
print('OUVERT capture-1080x2400.png', im.size)
# 1) toute la boite du bouton : y 515..655, x 60..1020 -- ou est l'encre ?
print('profil par colonne (nombre de px lum>22 sur y=515..655) :')
prof=[]
for x in range(60,1020):
    c=sum(1 for y in range(515,656) if lum(px[x,y])>22)
    prof.append((x,c))
# resume par tranches de 40 px
for i in range(0,len(prof),40):
    tr=prof[i:i+40]
    print('  x %4d..%4d : total encre=%4d  (max col=%d)'%(tr[0][0],tr[-1][0],sum(t[1] for t in tr),max(t[1] for t in tr)))
print()
# 2) dans la tranche du trou (x 700..900), y de tout pixel lum>22
ys=sorted(set(y for x in range(700,900) for y in range(500,680) if lum(px[x,y])>22))
print('x=700..900, y de l\'encre (lum>22) dans y500..680 :', ys)
print('  -> ce sont les lignes du TEXTE du bouton, pas un bord.')
# 3) geometrie du bouton
cols=[x for x in range(40,1050) if any(lum(px[x,y])>22 for y in range(515,656))]
print('bouton : x=%d..%d (w=%d px = %.1f CSS)'%(min(cols),max(cols),max(cols)-min(cols)+1,(max(cols)-min(cols)+1)/3.6))
rows=[y for y in range(500,680) if any(lum(px[x,y])>22 for x in range(60,1020))]
print('bouton : y=%d..%d (h=%d px = %.1f CSS)'%(min(rows),max(rows),max(rows)-min(rows)+1,(max(rows)-min(rows)+1)/3.6))
# 4) couleur du trait du bouton
print('couleur trait bouton (x=300,y=529) =',px[300,529],' (x=980,y=529) =',px[980,529])
print('couleur trait carte  (x=540,y=347) =',px[540,347])
