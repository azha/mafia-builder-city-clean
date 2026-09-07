# De cote ou de dessus ? Trois mesures, aucune hypothese.
#  (1) une arete de coin d'immeuble : sa pente dx/dy sur toute sa hauteur (une verticale du monde).
#  (2) hauteur de facade verticale visible + nombre de rangees de fenetres eclairees.
#  (3) l'eau : profil vertical du bas de l'image (reflet special).
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
def L(x,y):
    r,g,b=px[x,y]; return (r*299+g*587+b*114)//1000

print('\n(1) ARETE DE COIN — T3 : transition fond pale clair -> paroi sombre, balayee de gauche a droite')
pts=[]
for y in range(470,780,10):
    xt=None
    for x in range(690,760):
        if L(x,y)>=80 and L(x+4,y)<60: xt=x; break
    if xt: pts.append((xt,y)); print(f'   y={y:4d}  x_arete={xt}')
if len(pts)>=2:
    (x0,y0),(x1,y1)=pts[0],pts[-1]
    print(f'   de (x={x0},y={y0}) a (x={x1},y={y1}) : dx={x1-x0:+d} pour dy={y1-y0:+d}  => pente dx/dy = {(x1-x0)/(y1-y0):+.4f}')

print('\n(2) FACADE VERTICALE — colonne x=790 (face avant de T3), luminance de y=460 a 800 par pas de 5')
warm=0; prev=False
for y in range(460,805,5):
    r,g,b=px[790,y]
    chaud = (r-b)>=25 and L(790,y)>=90
    if chaud and not prev: warm+=1
    prev=chaud
print(f'   rangees de fenetres chaudes distinctes rencontrees sur cette colonne : {warm}')
print(f'   etendue verticale de la facade (toit y~450 -> pied y~790) : {790-450} px de MUR')

print('\n(3) EAU — colonne x=300, y=1400..1900 par pas de 25 (teal + reflet)')
for y in range(1400,1901,25):
    r,g,b=px[300,y]; print(f'   y={y:4d} rgb=({r:3d},{g:3d},{b:3d}) B-R={b-r:+4d} L={L(300,y):3d}')
