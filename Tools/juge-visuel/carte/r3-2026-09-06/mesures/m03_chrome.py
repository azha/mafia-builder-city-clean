# m03 - chrome : ou le chrome recouvre-t-il le contenu ? (delta sous-chrome / hors-chrome, 2400)
from PIL import Image, ImageChops
a=Image.open('../capture-1080x2400.png').convert('RGB')
b=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB')
print('sous chrome',a.size,'hors chrome',b.size)
d=ImageChops.difference(a,b).convert('L')
px=d.load(); W,H=d.size
# controle positif : au coeur du fleuve (y=1150) le delta doit etre 0 (aucun chrome la)
print('controle positif fleuve y=1150 :', max(px[x,1150] for x in range(0,W,3)))
prev=None
for y in range(H):
    n=sum(1 for x in range(0,W,3) if px[x,y]>6)
    st = 'CHROME' if n>0 else '.'
    if st!=prev:
        print(f'  y={y:5d} -> {st} (n={n})'); prev=st
