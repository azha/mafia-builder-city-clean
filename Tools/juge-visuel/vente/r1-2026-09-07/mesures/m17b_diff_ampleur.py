# m17b — AMPLEUR des differences entre les deux planches (un ecart de +-1 est du bruit de degrade,
# pas un changement d'ecran).
from PIL import Image
import os
from collections import Counter
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); pa=a.load()
b=Image.open(os.path.join(D,'capture-planche-1080x2400.png')).convert('RGB'); pb=b.load()
print('OUVERT', a.size, b.size)
w,h=a.size
for nom,(y0,y1) in {'bandeau':(0,144),'contenu':(144,2179),'dock':(2179,2400)}.items():
    c=Counter(); gros=[]
    for y in range(y0,y1):
        for x in range(0,w,1):
            d=max(abs(pa[x,y][k]-pb[x,y][k]) for k in range(3))
            if d: c[min(d,20)]+=1
            if d>8: gros.append((x,y,pa[x,y],pb[x,y]))
    print(f'  {nom:8s} : ecarts par amplitude (>=20 groupe) : {sorted(c.items())[:12]}')
    print(f'            px avec ecart >8 : {len(gros)}' + (f'  bbox x={min(g[0] for g in gros)}..{max(g[0] for g in gros)} y={min(g[1] for g in gros)}..{max(g[1] for g in gros)}' if gros else ''))
    if gros:
        # bandes y ou vivent les gros ecarts
        ys=sorted(set(g[1] for g in gros)); bandes=[]; deb=ys[0]; prev=ys[0]
        for y in ys[1:]:
            if y-prev>3: bandes.append((deb,prev)); deb=y
            prev=y
        bandes.append((deb,prev))
        print(f'            bandes y : {bandes[:12]}')
