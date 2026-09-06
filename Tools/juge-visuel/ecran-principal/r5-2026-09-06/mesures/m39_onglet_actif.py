# (b) bis : indicateur d'onglet actif. CONTROLE NEGATIF d'abord : localiser la barre sur la REFERENCE.
from common import *
def laiton(im,box,scale,label,cible=(176,141,62),tol=50):
    px=im.load(); pts=[(x,y) for y in range(box[1],box[3]) for x in range(box[0],box[2])
                       if all(abs(px[x,y][i]-cible[i])<tol for i in range(3))]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        print(f'  {label}: {len(pts)} px ; x {min(xs)}..{max(xs)} = {min(xs)/scale:.2f}..{(max(xs)+1)/scale:.2f} CSS (l={(max(xs)-min(xs)+1)/scale:.2f}) ; y {min(ys)/scale:.2f}..{(max(ys)+1)/scale:.2f} CSS (h={(max(ys)-min(ys)+1)/scale:.2f})')
    else:
        print(f'  {label}: 0 pixel')
r=op(REF); laiton(r,(200,1975,380,2010),REF_S,'REF barre sous EMPIRE (y 658..670 CSS)')
c=op(C24)
laiton(c,(100,2225,320,2310),CAP_S,'CAP2400 zone entre rond et libelle sous EMPIRE')
laiton(c,(100,2140,1000,2400),CAP_S,'CAP2400 TOUT le dock : un pixel laiton quelque part ?')
c19=op(C19); laiton(c19,(100,1660,1000,1920),CAP_S,'CAP1920 TOUT le dock')
t=op(T24); laiton(t,(100,2140,1000,2400),CAP_S,'TEMOIN famille TOUT le dock')
