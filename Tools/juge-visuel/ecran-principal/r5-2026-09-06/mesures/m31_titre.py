# Grandeur : hauteur de CAPITALE du titre de fiche, mesuree lettre par lettre (on prend la MEDIANE
# des lettres sans accent ni descendante), + centrage + largeur.
from txt import *
def lettres(im,box,scale,label,seuil=45):
    cols,base=colonnes(im,box,seuil)
    segs=segments(cols,gap=1,minw=2)
    print(f'  {label} (fond L={base:.0f}) : {len(segs)} traits')
    hs=[]
    for s in segs:
        ys=[y for x,yy in cols for y in yy if s[0]<=x<=s[1]]
        h=(max(ys)-min(ys)+1)/scale
        hs.append(h)
        print(f'     x {s[0]/scale:7.2f}..{(s[1]+1)/scale:7.2f} (l={(s[1]-s[0]+1)/scale:5.2f}) ; y {min(ys)/scale:7.2f}..{(max(ys)+1)/scale:7.2f} ; h={h:5.2f}')
    if hs:
        m=sorted(hs)[len(hs)//2]
        print(f'     -> hauteur MEDIANE des traits = {m:.2f} CSS')
r=op(REF); lettres(r,(360,1335,810,1380),REF_S,'REF titre "LE VERGE D\'OR"')
c=op(C19); lettres(c,(390,1195,690,1250),CAP_S,'CAP titre ligne 2 "1501, n 2"')
