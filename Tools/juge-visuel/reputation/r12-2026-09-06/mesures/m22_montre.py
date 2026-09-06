import sys; sys.path.insert(0,'.')
from lib import *
print("=== m22 : cadran de la montre — ellipse claire sur le torse ===")
CAS=[('REF','../reference-1080x2102.png',(85,880),130,1360,260,1440),
     ('JEU','../capture-1080x2400.png',  (81,908),126,1388,256,1468)]
for nom,f,(ox,oy),x0,y0,x1,y1 in CAS:
    im=ouvrir(f); p=px(im)
    print(f"  {nom} mediane du cadran = {mediane_fenetre(p, (x0+x1)//2-6,(y0+y1)//2-6,(x0+x1)//2+6,(y0+y1)//2+6)}")
    def cadran(c):
        r,g,b=c; return 85<lum(c)<190 and max(c)-min(c)<45
    bb=bbox_masque(im, cadran, x0,y0,x1,y1)
    print(f"     cadran : x{bb[0]}..{bb[2]} ({bb[2]-bb[0]+1}) y{bb[1]}..{bb[3]} ({bb[3]-bb[1]+1}) n={bb[4]}"
          f"  centre rel carte = ({(bb[0]+bb[2])/2-ox:.1f},{(bb[1]+bb[3])/2-oy:.1f})")
    print(f"     remplissage aire/boite = {bb[4]/((bb[2]-bb[0]+1)*(bb[3]-bb[1]+1)):.3f} (ellipse pleine = 0,785)")
