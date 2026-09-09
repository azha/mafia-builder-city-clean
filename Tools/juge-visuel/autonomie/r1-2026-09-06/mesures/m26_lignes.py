# m26 — profils ligne a ligne, fenetres etroites, pour isoler chaque ligne de texte.
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); pc=cap.load()
print('OUVERT capture',cap.size)
def profil(x0,x1,y0,y1,seuil,label):
    print(' %s  (x %d..%d)'%(label,x0,x1))
    seg=[];cur=None
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if sum(pc[x,y])>seuil)
        if n>0 and cur is None: cur=y
        elif n==0 and cur is not None: seg.append((cur,y-1)); cur=None
    if cur is not None: seg.append((cur,y1-1))
    for a,b in seg:
        xs=[x for x in range(x0,x1) if any(sum(pc[x,y])>seuil for y in range(a,b+1))]
        print('     y %4d..%4d h=%2d  x %4d..%4d'%(a,b,b-a+1,min(xs),max(xs)))
profil(430,640,20,80,3*45,'TITRE, a droite du solde')
profil(440,500,70,115,3*70,'SOUS-TITRE (uuid), a droite du solde')
profil(617,740,70,115,3*45,'"Oldest: 2 cycles"')
profil(320,560,155,215,3*60,'carte 2 : titre + cle A + valeur A')
profil(320,560,246,285,3*60,'carte 2 : cle B + valeur B')
