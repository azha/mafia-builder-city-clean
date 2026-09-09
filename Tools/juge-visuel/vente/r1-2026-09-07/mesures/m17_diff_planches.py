# m17 — DIFF des deux planches (deux CAMPAGNES = deux mondes ; on n'en tire AUCUNE regression,
# seulement un fait : ou les deux images different).
# Controle positif : deux images identiques a elles-memes -> 0 pixel different.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
b=Image.open(os.path.join(D,'capture-planche-1080x2400.png')).convert('RGB')
print('OUVERT', a.size, b.size)
pa,pb=a.load(),b.load()
w,h=a.size
zones={'bandeau y0..143':(0,144),'contenu y144..2178':(144,2179),'dock y2179..2399':(2179,2400)}
for nom,(y0,y1) in zones.items():
    n=0; xs=[]; ys=[]
    for y in range(y0,y1):
        for x in range(w):
            if pa[x,y]!=pb[x,y]:
                n+=1
                if len(xs)<400000: xs.append(x); ys.append(y)
    tot=(y1-y0)*w
    print(f'  {nom:22s} : {n} px differents / {tot} ({100.0*n/tot:.3f} %)' + (f'  bbox x={min(xs)}..{max(xs)} y={min(ys)}..{max(ys)}' if xs else ''))
print()
print('CONTROLE POSITIF (a vs a) :', sum(1 for y in range(300,700) for x in range(0,w,7) if pa[x,y]!=pa[x,y]), 'px differents (attendu 0)')
