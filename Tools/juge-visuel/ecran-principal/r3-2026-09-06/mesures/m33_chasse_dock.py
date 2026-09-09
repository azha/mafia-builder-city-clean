# m33 — chasse des libelles du dock (chaines IDENTIQUES : EMPIRE, FAMILLE, PLUS) et des boutons.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
def lettres(px,fac,x0,x1,y0,y1,thr=110,gapcss=0.7):
    C=lambda v:int(round(v*fac))
    cnt=[sum(1 for y in range(C(y0),C(y1)) if lum(px[x,y])>thr) for x in range(C(x0),C(x1))]
    out=[];cur=None;bl=0
    for i,c in enumerate(cnt):
        if c>=1:
            if cur is None: cur=[i,i]
            else: cur[1]=i
            bl=0
        else:
            if cur is not None:
                bl+=1
                if bl>C(gapcss): out.append(cur);cur=None
    if cur: out.append(cur)
    return [((a+C(x0))/fac,(b+1+C(x0))/fac) for a,b in out]
CAS=[('canon','../ecran-canon.png',3.0,{'EMPIRE':(74,113,670.5,677.5),'FAMILLE':(139,183,670.5,677.5),
      'PLUS':(285,311,670.5,677.5),'BLANCHIR':(160,232,555,565),'AMELIORER':(269,350,555,565)}),
     ('fiche19','../capture-fiche-1080x1920.png',2.755,{'EMPIRE':(74,114,669,676),'FAMILLE':(140,184,669,676),
      'PLUS':(285,311,669,676),'BLANCHIR':(157,234,555,565),'AMELIORER':(264,353,555,565)})]
for name,f,fac,W in CAS:
    im=Image.open(f).convert('RGB'); px=im.load(); print(f'== {name} {im.size}')
    for k,(a,b,c,d) in W.items():
        L=lettres(px,fac,a,b,c,d)
        if not L: print(f'   {k}: rien'); continue
        span=L[-1][1]-L[0][0]
        gl=[q-p for p,q in L]; gaps=[L[i+1][0]-L[i][1] for i in range(len(L)-1)]
        print(f'   {k:10s}: {len(L)} groupes, span={span:5.2f} CSS ; largeur glyphe moy={sum(gl)/len(gl):4.2f} ; blanc inter-lettre moy={sum(gaps)/len(gaps) if gaps else 0:4.2f}')
