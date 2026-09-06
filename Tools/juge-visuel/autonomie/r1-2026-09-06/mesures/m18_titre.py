# m18 — le titre est-il TRONQUE par le manometre, ou seulement recouvert ?
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); px=cap.load()
print('OUVERT capture',cap.size)
# encre du titre = pixels notablement plus clairs que le bandeau, dans la bande y 40..66
cols=[]
for x in range(280,900):
    n=sum(1 for y in range(38,68) if sum(px[x,y])>3*45)
    if n: cols.append((x,n))
xs=[c[0] for c in cols]
print('  encre du titre : x %d..%d'%(min(xs),max(xs)))
# segments
seg=[];cur=xs[0];prev=xs[0]
for x in xs[1:]:
    if x-prev>12: seg.append((cur,prev)); cur=x
    prev=x
seg.append((cur,prev))
print('  segments :',seg)
print()
print('--- ce qui se trouve a droite du manometre dans la bande du titre (x 690..900) ---')
for x in range(690,900,10):
    col=[px[x,y] for y in range(38,68)]
    mx=max(col,key=lambda p:sum(p))
    print('   x=%3d pixel le plus clair=%s'%(x,str(mx)))
print()
print('--- sous-titre : etendue (bande y 80..102) ---')
cols2=[x for x in range(280,900) if any(sum(px[x,y])>3*55 for y in range(80,102))]
seg2=[];cur=cols2[0];prev=cols2[0]
for x in cols2[1:]:
    if x-prev>14: seg2.append((cur,prev)); cur=x
    prev=x
seg2.append((cur,prev))
print('   x %d..%d  segments=%s'%(min(cols2),max(cols2),seg2))
