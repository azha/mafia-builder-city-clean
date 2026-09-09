# m10 : teinte de fond des quartiers, mediane d'une fenetre 21x21 posee sur un ILOT
# (pas sur une rue, pas sur une plaque). Points choisis dans le repere REFERENCE,
# reportes dans la capture par X=1.0225x-12 ; Y=1.0225y+8.
# Controle positif : le fleuve et un ilot navy quelconque doivent coincider (<6/255).
from PIL import Image
import statistics
S,DX,DY=1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
rp,cp=ref.load(),cap.load()
def med(px,cx,cy,w,h,r=10):
    v=[px[x,y] for y in range(cy-r,cy+r+1) for x in range(cx-r,cx+r+1) if 0<=x<w and 0<=y<h]
    return tuple(int(statistics.median([q[k] for q in v])) for k in range(3))
pts=[
 ('LES BASSINS  ilot',      140, 520),
 ('LES BASSINS  ilot 2',    250, 430),
 ('HAUTES-MARCHES ilot',    600, 760),
 ('HAUTES-MARCHES ilot 2',  760, 700),
 ('LA LISIERE (chez vous)', 900, 1600),
 ('LA LISIERE ilot bord',   1010,1560),
 ('QUAI-NORD ilot (temoin)',560, 560),
 ('SAINT-BRAND ilot (temoin)',150, 990),
 ('LE TREILLIS ilot (temoin)',200,1450),
 ('fleuve (temoin)',        300, 1150),
 ('mer du port (temoin)',   200,  260),
 ('DEPOT-EST ilot (temoin)',960,  990),
 ('LES ENTREPOTS ilot',     560, 1000),
]
print(f"\n{'point (repere REF)':26s} {'x,y ref':>10} {'REF':>16} {'x,y cap':>11} {'CAP':>16}   delta par canal")
for nom,x,y in pts:
    X,Y=int(S*x+DX),int(S*y+DY)
    a=med(rp,x,y,1080,2102); b=med(cp,X,Y,1080,2400)
    d=tuple(b[k]-a[k] for k in range(3))
    print(f"{nom:26s} {x:5d},{y:4d} {str(a):>16} {X:5d},{Y:5d} {str(b):>16}   {d}")
