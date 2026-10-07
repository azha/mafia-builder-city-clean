# m21 — (a) separateurs de rangee : epaisseur, couleur, etendue x ;
#       (b) filet laiton du haut du panneau : etendue x, profil d'intensite (la "loi" : rampes + plateau).
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
def sep(im,nom,ys,fondy):
    px=im.load()
    print(f'  --- {nom} separateurs ---')
    for y in ys:
        base=tuple(med([px[x,y+fondy][k] for x in range(300,500)]) for k in range(3))
        xs=[x for x in range(55,1025) if lum(px[x,y])-lum(base)>3]
        c=tuple(med([px[x,y][k] for x in range(400,700)]) for k in range(3))
        # epaisseur
        ep=0
        for dy in range(-4,6):
            cc=tuple(med([px[x,y+dy][k] for x in range(400,700)]) for k in range(3))
            if lum(cc)-lum(base)>3: ep+=1
        print(f'    y={y}: couleur {c} (fond {base}) etendue x {min(xs) if xs else None}..{max(xs) if xs else None} epaisseur={ep}')
def filet(im,nom,y,demi=6):
    px=im.load()
    print(f'  --- {nom} filet laiton, bande y{y-demi}..{y+demi} ---')
    prof=[]
    for x in range(40,1040,20):
        v=max(lum(px[xx,yy]) for yy in range(y-demi,y+demi+1) for xx in range(x,min(x+20,1040)))
        prof.append((x,round(v,1)))
    print('    max de luminance par tranche de 20 px :')
    print('   ', ' '.join(f'{x}:{v:.0f}' for x,v in prof))
    # couleur au centre
    best=max(((lum(px[x,yy]),px[x,yy],x,yy) for yy in range(y-demi,y+demi+1) for x in range(500,600)))
    print(f'    pic au centre : {best[1]} a x={best[2]} y={best[3]}')
ref=charge(REF); j19=charge(J19); j24=charge(J24)
sep(ref,'REF',[1075,1334],40); sep(j19,'JEU1920',[994,1198],40); sep(j24,'JEU2400',[1401,1605],40)
filet(ref,'REF',826); filet(j19,'JEU1920',755); filet(j24,'JEU2400',1162)
