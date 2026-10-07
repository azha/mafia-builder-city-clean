# m11 — lignes de texte de la colonne gauche du panneau : bandes d'encre (y) et etendue x.
# Encre = pixel dont la luminance depasse de >25 la mediane de sa ligne dans la zone.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
def bandes(im,nom,xg,xd,y0,y1,seuil=25):
    px=im.load(); print(f'  --- {nom} colonne x{xg}..{xd} ---')
    enc=[]
    for y in range(y0,y1):
        base=med([lum(px[x,y]) for x in range(xg,xd)])
        xs=[x for x in range(xg,xd) if lum(px[x,y])-base>seuil]
        enc.append((y,len(xs),min(xs) if xs else None,max(xs) if xs else None))
    cur=None
    for y,n,a,b in enc:
        if n>=2 and cur is None: cur=[y,a,b,n]
        elif n>=2: cur[1]=min(cur[1],a); cur[2]=max(cur[2],b); cur[3]=max(cur[3],n)
        elif n<2 and cur is not None:
            print(f'    bande y {cur[0]}..{y-1}  h={y-cur[0]}  x {cur[1]}..{cur[2]}  larg={cur[2]-cur[1]+1}')
            cur=None
    if cur: print(f'    bande y {cur[0]}..{y1-1}  h={y1-cur[0]}  x {cur[1]}..{cur[2]}')
bandes(charge(REF),'REF',100,640,860,1560)
bandes(charge(J19),'JEU1920',85,640,780,1440)
bandes(charge(J24),'JEU2400',85,640,1180,1860)
