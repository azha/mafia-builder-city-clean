# Grandeur : le fond du panneau .fiche laisse-t-il passer l'art ? On mesure l'ETENDUE des valeurs
# du fond du panneau sur des bandes SANS encre, et le contraste des textes sur leur fond local.
# Controle positif : REF fond du panneau = (15,23,37)->(9,15,25) (r3 g17), etendue faible.
from common import *
def fond(im,bandes,scale,label):
    px=im.load(); tout=[]
    print(f'  {label}')
    for (x0,y0,x1,y1,nom) in bandes:
        vals=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
        Ls=sorted(lum(v) for v in vals)
        med=sorted(vals,key=lum)[len(vals)//2]
        print(f'     {nom:26s} n={len(vals):6d} ; median {med} L={lum(med):5.1f} ; L min {Ls[0]:5.1f} p5 {Ls[len(Ls)//20]:5.1f} p95 {Ls[-len(Ls)//20]:5.1f} max {Ls[-1]:5.1f} ; ETENDUE p5-p95 = {Ls[-len(Ls)//20]-Ls[len(Ls)//20]:5.1f}')
        tout+=Ls
    tout.sort()
    print(f'     TOTAL : L p5 {tout[len(tout)//20]:.1f} p95 {tout[-len(tout)//20]:.1f} etendue {tout[-len(tout)//20]-tout[len(tout)//20]:.1f}')
r=op(REF)
fond(r,[(60,1300,1120,1330,'sous le filet haut'),
        (60,1460,1120,1480,'au-dessus des stats'),
        (60,1590,1120,1610,'sous les libelles'),
        (60,1750,1120,1775,'sous les boutons')],REF_S,'REF panneau de fiche')
c=op(C19)
fond(c,[(45,1150,1030,1175,'sous le filet haut'),
        (45,1285,1030,1310,'au-dessus des stats'),
        (45,1405,1030,1425,'sous les libelles'),
        (45,1565,1030,1585,'sous les boutons')],CAP_S,'CAP1920 panneau de fiche')
