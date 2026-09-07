# Ligne de base du "Verge d'Or" (T8) sous G9 : pour chaque colonne HORS badge et HORS libelle,
# y du minimum de luminance dans 912..950 (la jonction mur/trottoir est une ligne d'ombre).
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
EXCL=set(range(526,555))  # libelle + disque
pts=[]
print('   x   y_min  L_min   L(y_min-6)  L(y_min+6)')
for x in range(500,580):
    if x in EXCL: continue
    best=None
    for y in range(912,951):
        r,g,b=px[x,y]; L=(r*299+g*587+b*114)//1000
        if best is None or L<best[1]: best=(y,L)
    y,L=best
    r0,g0,b0=px[x,max(0,y-6)]; L0=(r0*299+g0*587+b0*114)//1000
    r1,g1,b1=px[x,y+6]; L1=(r1*299+g1*587+b1*114)//1000
    print(f'  {x:4d}  {y:5d}  {L:5d}   {L0:9d}  {L1:9d}')
    if L1-L>=25: pts.append((x,y))
if len(pts)>=2:
    n=len(pts); sx=sum(p[0] for p in pts); sy=sum(p[1] for p in pts)
    sxx=sum(p[0]*p[0] for p in pts); sxy=sum(p[0]*p[1] for p in pts)
    a=(n*sxy-sx*sy)/(n*sxx-sx*sx); b=(sy-a*sx)/n
    print(f'\n{n} colonnes retenues (contraste >=25) ; droite ajustee y = {a:.4f}*x + {b:.2f}')
    print(f'  base sous le badge (x=539,5) : y = {a*539.5+b:.1f}')
    print(f'  ancrage G9 y=957  =>  {957-(a*539.5+b):.1f} px SOUS la base de T8')
