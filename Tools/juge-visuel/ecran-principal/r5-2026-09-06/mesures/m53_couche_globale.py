# Couche globale RESTREINTE au chrome (bandeau au-dessus du filet) + la fiche, comme l'impose le dossier
# (reference de NUIT vs capture de JOUR : la palette de l'ART n'est pas comparable).
from common import *
from collections import Counter
def couche(im,zones,label):
    cnt=Counter(); Ls=[]; n=0
    for (x0,y0,x1,y1) in zones:
        for y in range(y0,y1):
            for x in range(x0,x1):
                c=im.getpixel((x,y)); cnt[(c[0]//24*24,c[1]//24*24,c[2]//24*24)]+=1; Ls.append(lum(c)); n+=1
    Ls.sort()
    encre=sum(1 for l in Ls if l>60)/n
    print(f'  {label} : n={n}  L moyenne {sum(Ls)/n:6.2f}  mediane {Ls[n//2]:6.2f}  p95 {Ls[int(n*0.95)]:6.2f}  densite d encre (L>60) {encre*100:5.2f} %')
    print(f'     palette : ' + ' | '.join(f'{k} {v*100/n:.1f}%' for k,v in cnt.most_common(5)))
r=op(REF)
couche(r,[(0,0,1176,152),(42,1285,1136,1786)],'REF   bandeau(0..50,7 CSS) + fiche')
c=op(C19)
couche(c,[(0,0,1080,163),(35,1131,1044,1590)],'CAP19 bandeau(0..59,2 CSS) + fiche')
