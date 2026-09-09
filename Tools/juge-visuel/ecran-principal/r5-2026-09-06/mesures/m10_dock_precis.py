# Grandeur : diametre et centres des 4 ronds du dock, par leur BORD clair (anneau).
# Convention de bord : bbox du bord clair = diametre EXTERIEUR (nominal).
# Controle positif : REF doit rendre diam 46,00 CSS et centres 94/162/230/298 (mesure-canon + r3).
from common import *
def bord_ring(im,box,scale,label):
    px=im.load(); x0,y0,x1,y1=box
    # fond = mediane de la bande ; le bord du rond est plus CLAIR que le fond et que l'interieur
    cols={}
    for y in range(y0,y1):
        vals=[lum(px[x,y]) for x in range(x0,x1)]
        base=sorted(vals)[len(vals)//2]
        for x in range(x0,x1):
            if lum(px[x,y])-base>7: cols.setdefault(x,[]).append(y)
    xs=sorted(cols)
    segs=[];cur=None
    for x in xs:
        if cur is None: cur=[x,x]
        elif x-cur[1]<=6: cur[1]=x
        else: segs.append(tuple(cur)); cur=[x,x]
    if cur: segs.append(tuple(cur))
    segs=[s for s in segs if s[1]-s[0]>25]
    print(f'  {label}')
    for s in segs:
        ys=[y for x in range(s[0],s[1]+1) for y in cols.get(x,[])]
        d=s[1]-s[0]+1; cy=(min(ys)+max(ys))/2
        print(f'     rond x {s[0]}..{s[1]} diam {d} px = {d/scale:6.2f} CSS ; centre x {(s[0]+s[1])/2/scale:7.2f} CSS ; hauteur {max(ys)-min(ys)+1} px = {(max(ys)-min(ys)+1)/scale:6.2f} CSS ; centre y {cy/scale:7.2f} CSS')
    if len(segs)>=2:
        c=[(s[0]+s[1])/2/scale for s in segs]
        print(f'     pas entre ronds : {[round(c[i+1]-c[i],2) for i in range(len(c)-1)]} CSS')
    return segs
r=op(REF);  bord_ring(r,(150,1855,1060,1990),REF_S,'REF dock')
c=op(C24);  bord_ring(c,(100,2140,1000,2320),CAP_S,'CAP2400 district dock')
c19=op(C19);bord_ring(c19,(100,1660,1000,1840),CAP_S,'CAP1920 fiche dock')
t=op(T24);  bord_ring(t,(100,2140,1000,2320),CAP_S,'TEMOIN famille dock')
