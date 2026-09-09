import sys; sys.path.insert(0,'.')
from lib import *
print("=== m22b : cadran de la montre — masque par la couleur exacte du cadran ===")
CAS=[('REF','../reference-1080x2102.png',(85,880),(35,42,45),100,1330,300,1470),
     ('JEU','../capture-1080x2400.png',  (81,908),(34,42,46),100,1358,300,1498)]
for nom,f,(ox,oy),col,x0,y0,x1,y1 in CAS:
    im=ouvrir(f)
    bb=bbox_masque(im, lambda c: all(abs(c[i]-col[i])<=3 for i in range(3)), x0,y0,x1,y1)
    w,h=bb[2]-bb[0]+1, bb[3]-bb[1]+1
    print(f"  {nom} cadran ({col}) : x{bb[0]}..{bb[2]} ({w}) y{bb[1]}..{bb[3]} ({h}) aire={bb[4]}")
    print(f"     centre rel carte = ({(bb[0]+bb[2])/2-ox:.1f},{(bb[1]+bb[3])/2-oy:.1f}) ; remplissage = {bb[4]/(w*h):.3f}")
