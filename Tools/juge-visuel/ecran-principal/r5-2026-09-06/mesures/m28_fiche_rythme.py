# Grandeur : rythme vertical INTERNE de la fiche (bandes d'encre claire), et paddings.
# Reperes : REF panneau y 427.67..596.00 CSS ; CAP panneau y 409.79..578.20 CSS.
from common import *
def bandes(im,box,scale,label,seuil=45,haut_panneau=0.0):
    px=im.load(); x0,y0,x1,y1=box
    vals=[lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    base=sorted(vals)[len(vals)//4]
    print(f'  {label} (fond L={base:.0f}, haut du panneau = {haut_panneau:.2f} CSS)')
    cur=None
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if lum(px[x,y])-base>seuil]
        if xs:
            if cur is None: cur=[y,y,min(xs),max(xs)]
            else: cur[1]=y; cur[2]=min(cur[2],min(xs)); cur[3]=max(cur[3],max(xs))
        else:
            if cur:
                print(f'     y {cur[0]/scale:7.2f}..{(cur[1]+1)/scale:7.2f} CSS (h={(cur[1]-cur[0]+1)/scale:5.2f}, rel haut {cur[0]/scale-haut_panneau:6.2f}) ; x {cur[2]/scale:7.2f}..{(cur[3]+1)/scale:7.2f} CSS (l={(cur[3]-cur[2]+1)/scale:6.2f}, centre {(cur[2]+cur[3])/2/scale:7.2f})')
            cur=None
    if cur: print(f'     y {cur[0]/scale:7.2f}..{(cur[1]+1)/scale:7.2f} CSS (h={(cur[1]-cur[0]+1)/scale:5.2f}, rel haut {cur[0]/scale-haut_panneau:6.2f}) ; x {cur[2]/scale:7.2f}..{(cur[3]+1)/scale:7.2f} CSS (l={(cur[3]-cur[2]+1)/scale:6.2f}, centre {(cur[2]+cur[3])/2/scale:7.2f})')
r=op(REF); bandes(r,(48,1285,1135,1790),REF_S,'REF fiche',45,427.67)
print()
c=op(C19); bandes(c,(40,1132,1040,1592),CAP_S,'CAP1920 fiche',45,409.79)
