# m46 — couches globales : palette quantifiee, luminance moyenne, densite d'encre, par ZONE (chrome / fiche).
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
from PIL import Image
print('=== m46 couches globales par zone ===')
def couche(path,nom,box,sc):
    im=Image.open(path).convert('RGB').crop(box)
    px=im.load(); W,H=im.size
    q=im.quantize(colors=6, method=Image.MEDIANCUT).convert('RGB')
    hist={}
    qp=q.load()
    for y in range(H):
        for x in range(W):
            hist[qp[x,y]]=hist.get(qp[x,y],0)+1
    tot=W*H
    ls=[]; enc=0
    for y in range(0,H,2):
        for x in range(0,W,2):
            l=lum(px[x,y]); ls.append(l)
            if l>0.10: enc+=1
    print('   [%s] %s  %dx%d px = %.2f x %.2f CSS' % (nom,str(box),W,H,W/sc,H/sc))
    print('      palette (6 classes) : ' + ' | '.join('%s %.1f%%'%(str(c),100.0*n/tot) for c,n in sorted(hist.items(),key=lambda kv:-kv[1])))
    print('      luminance moyenne %.4f ; mediane %.4f ; L* moyen %.1f ; densite d\'encre (L>0,10) %.1f %%'
          % (sum(ls)/len(ls), med(ls), L((0,0,0)) if False else 116*((sum(ls)/len(ls))**(1/3.0))-16, 100.0*enc/len(ls)))
couche(CANON,'canon BANDEAU',(0,0,1176,157),SC_CANON)
couche(DIST,'jeu   BANDEAU',(0,0,1080,143),SC_CAPT)
couche(CANON,'canon FICHE',(39,1273,1137,1781),SC_CANON)
couche(F2400,'jeu   FICHE',(33,1651,1046,2118),SC_CAPT)
couche(CANON,'canon DOCK',(0,1817,1176,2091),SC_CANON)
couche(DIST,'jeu   DOCK (2400)',(0,2160,1080,2400),SC_CAPT)
