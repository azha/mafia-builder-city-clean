# m13 — la ZONE VIDE de la capture, la geometrie du chrome, le disque-icone, la couleur des pips.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom in ['capture-1080x2400.png','capture-planche-1080x2400.png']:
    im=Image.open(os.path.join(D,nom)).convert('RGB'); px=im.load(); w,h=im.size
    print(f'=== {nom} {im.size} ===')
    # 1) filet du bandeau (braise) et bas du bandeau
    for y in range(130,155):
        c=sum(1 for x in range(0,w,4) if lum(px[x,y])>40)
        if c>100: print(f'  filet bandeau y={y} : {c*4} px lum>40  rgb(x=540)={px[540,y]}')
    # 2) haut du dock
    prem=None
    for y in range(2050,h):
        if any(lum(px[x,y])>18 for x in range(0,w,3)): prem=y; break
    print(f'  premiere ligne du DOCK (lum>18) : {prem}')
    # 3) la zone vide : y du dernier contenu de l'ecran, et compte de px non-fond
    dern=None; nonfond=0
    for y in range(672,prem):
        for x in range(0,w,2):
            if lum(px[x,y])>16.5: nonfond+=1; dern=y
    print(f'  ZONE ENTRE la carte (bas y=669) et le dock (y={prem}) : hauteur={prem-670} px ({(prem-670)/3.6:.0f} CSS)')
    print(f'    pixels non-fond (lum>16,5 ; 1 col sur 2) : {nonfond} ; dernier y = {dern}')
    print(f'    part de la zone libre bandeau..dock occupee par du contenu : '
          f'{100.0*(669-144)/(prem-144):.1f} %  (vide = {100.0*(prem-669)/(prem-144):.1f} %)')
    # 4) disque-icone
    xs=[x for x in range(40,160) if any(lum(px[x,y])>60 for y in range(360,430))]
    ys=[y for y in range(360,430) if any(lum(px[x,y])>60 for x in range(40,160))]
    print(f'  DISQUE icone : x={min(xs)}..{max(xs)} ({max(xs)-min(xs)+1} px = {(max(xs)-min(xs)+1)/3.6:.2f} CSS) y={min(ys)}..{max(ys)} ({max(ys)-min(ys)+1} px)')
    print(f'    couleur au centre = {px[(min(xs)+max(xs))//2,(min(ys)+max(ys))//2]}')
    # 5) couleur du trait des pips
    print(f'  pip ALLUME trait haut (x=195,y=439) = {px[195,439]} ; pip ETEINT (x=310,y=439) = {px[310,439]}')
    print(f'  pip ALLUME interieur (x=195,y=450) = {px[195,450]} ; pip ETEINT interieur (x=310,y=450) = {px[310,450]}')
    # 6) losange au-dessus du titre
    xs=[x for x in range(400,700) if any(lum(px[x,y])>50 for y in range(210,240))]
    ys=[y for y in range(205,245) if any(lum(px[x,y])>50 for x in range(400,700))]
    print(f'  LOSANGE : x={min(xs)}..{max(xs)} y={min(ys)}..{max(ys)} ({max(xs)-min(xs)+1}x{max(ys)-min(ys)+1} px) couleur={px[(min(xs)+max(xs))//2,(min(ys)+max(ys))//2]}')
    print()
