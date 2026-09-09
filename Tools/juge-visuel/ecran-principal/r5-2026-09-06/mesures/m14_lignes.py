# Profil par LIGNES du bandeau : ou est l'encre claire, aile par aile.
from txt import *
def rows(im,box,scale,label,seuil=30):
    px=im.load(); x0,y0,x1,y1=box
    vals=[lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    base=sorted(vals)[len(vals)//2]
    print(f'  {label} (fond L={base:.0f})')
    cur=None
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if lum(px[x,y])-base>seuil]
        if xs:
            if cur is None: cur=[y,y,min(xs),max(xs)]
            else: cur[1]=y; cur[2]=min(cur[2],min(xs)); cur[3]=max(cur[3],max(xs))
        else:
            if cur: print(f'     bande y {cur[0]}..{cur[1]} ({cur[0]/scale:6.2f}..{(cur[1]+1)/scale:6.2f} CSS, h={(cur[1]-cur[0]+1)/scale:5.2f}) x {cur[2]}..{cur[3]} ({cur[2]/scale:7.2f}..{(cur[3]+1)/scale:7.2f} CSS)')
            cur=None
    if cur: print(f'     bande y {cur[0]}..{cur[1]} ({cur[0]/scale:6.2f}..{(cur[1]+1)/scale:6.2f} CSS, h={(cur[1]-cur[0]+1)/scale:5.2f}) x {cur[2]}..{cur[3]} ({cur[2]/scale:7.2f}..{(cur[3]+1)/scale:7.2f} CSS)')
r=op(REF)
rows(r,(10,20,470,150),REF_S,'REF aile GAUCHE (x 3.3..156.7 CSS)')
rows(r,(700,20,1176,150),REF_S,'REF aile DROITE (x 233..392 CSS)')
c=op(C24)
rows(c,(0,10,460,165),CAP_S,'CAP2400 aile GAUCHE')
rows(c,(660,10,1080,165),CAP_S,'CAP2400 aile DROITE')
t=op(T24)
rows(t,(0,10,440,140),CAP_S,'TEMOIN aile GAUCHE')
rows(t,(680,10,1080,140),CAP_S,'TEMOIN aile DROITE')
