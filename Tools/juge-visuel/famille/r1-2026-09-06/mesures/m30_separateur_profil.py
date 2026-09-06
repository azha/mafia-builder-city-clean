# m30 — profil d'intensite du separateur de tete (degrade transparent->laiton->transparent).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def prof(im,ys,x0,x1,S,OX,label,bg):
    px=im.load()
    print(' %s (fond %s) — %% de la largeur de la feuille : R-fond'%(label,bg))
    out=[]
    for pct in range(0,101,4):
        x=int(round(OX+ (pct/100.0)*560*S))
        x=max(x0,min(x1-1,x))
        v=max(max(0,px[x,y][0]-bg[0]) for y in ys)
        out.append('%d:%d'%(pct,v))
    print('   '+' '.join(out))
prof(ref,range(229,233),0,1120,2.0,0,'REF separateur',(22,25,27))
prof(cap,range(473,477),13,1066,1.88036,13,'CAP separateur',(24,24,29))
