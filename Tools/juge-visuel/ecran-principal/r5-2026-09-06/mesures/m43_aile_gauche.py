# Aile gauche isolee (x restreint pour exclure la fleche retour) : libelle, valeur, barre.
from txt import *
def rows(im,box,scale,label,seuil=40):
    px=im.load(); x0,y0,x1,y1=box
    base=sorted([lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)])[len(range(y0,y1))*len(range(x0,x1))//2]
    print(f'  {label} (x {x0/scale:.1f}..{x1/scale:.1f} CSS, fond L={base:.0f})')
    cur=None
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if lum(px[x,y])-base>seuil]
        if xs:
            if cur is None: cur=[y,y,min(xs),max(xs)]
            else: cur[1]=y; cur[2]=min(cur[2],min(xs)); cur[3]=max(cur[3],max(xs))
        else:
            if cur:
                bestc=max(((x,y2) for y2 in range(cur[0],cur[1]+1) for x in range(cur[2],cur[3]+1) if lum(px[x,y2])-base>seuil),key=lambda p:lum(px[p]))
                print(f'     y {cur[0]/scale:6.2f}..{(cur[1]+1)/scale:6.2f} (h {(cur[1]-cur[0]+1)/scale:5.2f}) ; x {cur[2]/scale:7.2f}..{(cur[3]+1)/scale:7.2f} (l {(cur[3]-cur[2]+1)/scale:6.2f}) ; couleur {px[bestc]}')
            cur=None
    if cur:
        print(f'     y {cur[0]/scale:6.2f}..{(cur[1]+1)/scale:6.2f} (h {(cur[1]-cur[0]+1)/scale:5.2f}) ; x {cur[2]/scale:7.2f}..{(cur[3]+1)/scale:7.2f} (l {(cur[3]-cur[2]+1)/scale:6.2f})')
c=op(C24); rows(c,(100,20,470,160),CAP_S,'CAP2400 aile gauche')
r=op(REF); rows(r,(40,20,300,140),REF_S,'REF aile gauche')
t=op(T24); rows(t,(40,20,340,140),CAP_S,'TEMOIN aile gauche')
