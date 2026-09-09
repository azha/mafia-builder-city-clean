# m27 — bloc d option A isole (meme fenetre que B, qui a rendu un resultat propre).
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); pc=cap.load()
print('OUVERT capture',cap.size)
for (y0,y1,lab) in [(155,180,'titre "COOK"'),(178,212,'bloc A (cle + valeur)'),(250,285,'bloc B (cle + valeur) TEMOIN')]:
    seg=[];cur=None
    for y in range(y0,y1):
        n=sum(1 for x in range(320,565) if sum(pc[x,y])>3*60)
        if n>0 and cur is None: cur=y
        elif n==0 and cur is not None: seg.append((cur,y-1)); cur=None
    if cur is not None: seg.append((cur,y1-1))
    print(' %s :'%lab)
    for a,b in seg:
        xs=[x for x in range(320,565) if any(sum(pc[x,y])>3*60 for y in range(a,b+1))]
        print('     y %4d..%4d h=%2d  x %4d..%4d (w=%3d)'%(a,b,b-a+1,min(xs),max(xs),max(xs)-min(xs)+1))
print()
print(' --- ligne y=185 (cle A) : segments d encre ---')
xs=[x for x in range(315,600) if sum(pc[x,185])>3*60]
print('    ',xs[:6],'...',xs[-6:] if xs else '', ' n=%d'%len(xs))
