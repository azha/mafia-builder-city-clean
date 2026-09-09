# Grandeur : separateurs de stats, centres des 3 cellules, boutons (bbox, largeur, ecarts).
# Controle positif : REF separateurs a x 140,0 et 251,7 CSS ; boutons : ligne 332,7 CSS de large (r3 g8, g24).
from txt import *
def separateurs(im,y0,y1,x0,x1,scale,label):
    px=im.load()
    # un separateur = colonne verticale un peu plus claire que le fond, continue sur >60% de la hauteur
    base=sorted([lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)])[int(0.4*(y1-y0)*(x1-x0))]
    cands=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1) if lum(px[x,y])-base>4)
        if n>0.6*(y1-y0): cands.append((x,n))
    segs=[];cur=None
    for x,n in cands:
        if cur is None: cur=[x,x]
        elif x-cur[1]<=2: cur[1]=x
        else: segs.append(tuple(cur)); cur=[x,x]
    if cur: segs.append(tuple(cur))
    print(f'  {label} separateurs (fond L={base:.0f}) : ' + ', '.join(f'x {s[0]}..{s[1]} = {(s[0]+s[1])/2/scale:.2f} CSS' for s in segs))
def boutons(im,y0,y1,x0,x1,scale,label,seuil=14):
    px=im.load()
    base=sorted([lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)])[int(0.3*(y1-y0)*(x1-x0))]
    cols=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1) if lum(px[x,y])-base>seuil)
        cols.append((x,n))
    segs=[];cur=None
    for x,n in cols:
        if n>3:
            if cur is None: cur=[x,x]
            elif x-cur[1]<=6: cur[1]=x
            else: segs.append(tuple(cur)); cur=[x,x]
    if cur: segs.append(tuple(cur))
    segs=[s for s in segs if s[1]-s[0]>30]
    print(f'  {label} boutons (fond L={base:.0f}) :')
    prev=None
    for s in segs:
        ys=[y for y in range(y0,y1) if any(lum(px[x,y])-base>seuil for x in range(s[0],s[1]+1))]
        print(f'     x {s[0]}..{s[1]} = {s[0]/scale:7.2f}..{(s[1]+1)/scale:7.2f} CSS (l={(s[1]-s[0]+1)/scale:6.2f}) ; y {min(ys)/scale:7.2f}..{(max(ys)+1)/scale:7.2f} (h={(max(ys)-min(ys)+1)/scale:5.2f})'
              + (f' ; ecart au precedent {(s[0]-prev)/scale:5.2f} CSS' if prev else ''))
        prev=s[1]+1
r=op(REF)
separateurs(r,1480,1580,150,1120,REF_S,'REF')
boutons(r,1615,1745,60,1140,REF_S,'REF')
print()
c=op(C19)
separateurs(c,1425,1530,120,1020,CAP_S,'CAP1920')
boutons(c,1435,1560,60,1040,CAP_S,'CAP1920')
