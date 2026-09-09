# Le badge et son libelle sont-ils OPAQUES ? Si oui, deux badges superposes a l identique sont
# INDETECTABLES et je dois le dire. Si le texte est semi-transparent, une double frappe serait
# plus opaque -> detecteur possible.
#  (a) disque du badge : les 11 pastilles doivent-elles etre identiques bit a bit ?
#  (b) libelle : couleur du glyphe la plus claire, comparee au fond local.
from PIL import Image
from collections import Counter
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
C=[(1,347.5,552.5),(2,539.5,552.5),(3,731.5,552.5),(4,155.5,744.5),(5,347.5,744.5),(6,539.5,744.5),
   (7,923.5,744.5),(8,155.5,936.5),(9,539.5,936.5),(10,155.5,1320.5),(11,731.5,1320.5)]
print('(a) empreinte du disque (14x14 centre sur l anneau), et fond a 25 px a droite :')
emp={}
for k,cx,cy in C:
    X,Y=int(cx-6.5),int(cy-6.5)
    d=tuple(px[X+i,Y+j] for j in range(14) for i in range(14))
    emp[k]=d
    fond=px[int(cx)+30,int(cy)]
    print(f'  G{k:<2d} sha-like: {hash(d)&0xffffffff:08x}  fond voisin rgb={fond}')
groupes={}
for k,v in emp.items(): groupes.setdefault(v,[]).append(k)
print(f'  -> {len(groupes)} empreintes distinctes sur 11 : ' + ' ; '.join(str(v) for v in groupes.values()))
print('\n(b) glyphe du libelle : pixel le plus clair de la bande, et fond local median')
for k,cx,cy in C:
    y0,y1=int(cy)+15,int(cy)+22
    band=[px[x,y] for y in range(y0,y1) for x in range(int(cx)-33,int(cx)+33)]
    top=max(band,key=lambda c:c[0]+c[1]+c[2])
    fondband=[px[x,y] for y in range(y0,y1) for x in (int(cx)-60,int(cx)-58,int(cx)+58,int(cx)+60) if 0<=x<W]
    fondband.sort(key=lambda c:c[0]+c[1]+c[2])
    med=fondband[len(fondband)//2]
    print(f'  G{k:<2d} glyphe le plus clair={top}   fond lateral median={med}')
