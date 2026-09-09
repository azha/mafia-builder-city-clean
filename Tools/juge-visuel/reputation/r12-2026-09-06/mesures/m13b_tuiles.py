import sys; sys.path.insert(0,'.')
from lib import *
print("=== m13b : bords des 4 tuiles, colonne vide a droite du texte ===")
def bords(im, x0,x1, y0,y1, dl=2.5):
    p=px(im); prof=[sum(lum(p[x,y]) for x in range(x0,x1))/(x1-x0) for y in range(y0,y1)]
    pics=[]
    for i in range(2,len(prof)-2):
        if prof[i]-min(prof[i-2],prof[i+2])>dl and prof[i]>=prof[i-1] and prof[i]>=prof[i+1]:
            if pics and y0+i-pics[-1][0]<=4: continue
            pics.append((y0+i, round(prof[i],1)))
    return pics
CAS=[('REF','../reference-1080x2102.png',452, 955,990, 990,1470, 398,1159),
     ('JEU','../capture-1080x2400.png',  482, 960,995, 990,1440, 394,1173)]
for nom,f,ct,x0,x1,y0,y1,er0,er1 in CAS:
    im=ouvrir(f)
    b=bords(im,x0,x1,y0,y1)
    print(f"  {nom} pics : {[y for y,_ in b]}")
    ys=[y for y,_ in b]
    if len(ys)>=8:
        h=[ys[1]-ys[0]+1, ys[3]-ys[2]+1, ys[5]-ys[4]+1, ys[7]-ys[6]+1]
        pas=[ys[2]-ys[0], ys[4]-ys[2], ys[6]-ys[4]]
        gout=[ys[2]-ys[1]-1, ys[4]-ys[3]-1, ys[6]-ys[5]-1]
        print(f"     hauteurs {h}  pas {pas}  gouttieres {gout}")
        print(f"     pile de tuiles : rel {ys[0]-ct}..{ys[7]-ct} = {ys[7]-ys[0]+1} px")
        print(f"     panneau elast rel {er0}..{er1} (h={er1-er0+1})")
        print(f"     VIDE sous la 4e tuile : {er1-(ys[7]-ct)} px = {100*(er1-(ys[7]-ct))/(er1-er0+1):.1f} % du panneau")
