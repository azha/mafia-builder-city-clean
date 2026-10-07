# m4 — profil vertical : RGB median par ligne sur une colonne etroite, pour localiser
# le haut/bas du panneau, la plaque TRANCHER et le dock. On imprime les ruptures.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge

def med(vals):
    v=sorted(vals); return v[len(v)//2]

def prof(im,nom,x0,x1,ydeb,yfin):
    px=im.load(); w,h=im.size
    print(f'  {nom} colonne x{x0}..{x1}')
    prev=None
    for y in range(ydeb,min(yfin,h)):
        r=med([px[x,y][0] for x in range(x0,x1)])
        g=med([px[x,y][1] for x in range(x0,x1)])
        b=med([px[x,y][2] for x in range(x0,x1)])
        cur=(r,g,b)
        if prev is None or max(abs(cur[i]-prev[i]) for i in range(3))>=4:
            print(f'    y={y:5d}  rgb={cur}')
            prev=cur
    return

# colonne a x 20..34 : a gauche du panneau (marge), traverse fond -> plaque -> dock
prof(charge(REF),'REF',20,34,800,2102)
