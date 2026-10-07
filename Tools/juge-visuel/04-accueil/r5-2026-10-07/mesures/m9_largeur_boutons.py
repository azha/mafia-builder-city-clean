# m9 — largeur des boutons, mesuree depuis le BORD DROIT en marchant vers la gauche
# jusqu'au premier run de >=10 px egaux au fond du panneau. Immunise contre le texte du titre.
# Controle positif : le bord droit des 3 boutons doit etre le MEME x dans chaque image.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
BANDES={'REF':[(945,1036),(1159,1250),(1418,1509)],
        'JEU1920':[(865,956),(1050,1142),(1275,1367)],
        'JEU2400':[(1271,1363),(1456,1548),(1682,1774)]}
FOND={'REF':(10,16,27),'JEU1920':(11,16,27),'JEU2400':(10,16,27)}
def est_fond(p,f,tol=3): return all(abs(p[i]-f[i])<=tol for i in range(3))
def fiche(im,nom):
    px=im.load(); f=FOND[nom]
    print(f'  --- {nom} ---')
    for i,(y0,y1) in enumerate(BANDES[nom],1):
        ym=(y0+y1)//2
        # bord droit : premier x en partant de 1028 vers la gauche qui n'est PAS fond
        d=next(x for x in range(1028,600,-1) if not est_fond(px[x,ym],f))
        # bord gauche : en marchant de d vers la gauche, premier run de 10 px de fond
        g=None; run=0
        for x in range(d,560,-1):
            if est_fond(px[x,ym],f):
                run+=1
                if run>=10: g=x+10; break
            else: run=0
        print(f'    B{i}: x {g}..{d}  largeur={d-g+1}  hauteur={y1-y0+1}  marge droite={1032-d}')
        # rayon : largeur mesuree de la meme facon a y0+k
        prof=[]
        for k in (0,1,2,3,4,6,8,12,16,20,24,28,32):
            y=y0+k
            try: dd=next(x for x in range(1028,600,-1) if not est_fond(px[x,y],f))
            except StopIteration: prof.append('-'); continue
            gg=None; r=0
            for x in range(dd,560,-1):
                if est_fond(px[x,y],f):
                    r+=1
                    if r>=10: gg=x+10; break
                else: r=0
            prof.append(f'{k}:{dd-gg+1}' if gg else '-')
        print(f'      largeur(y0+k) {prof}')
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]:
    fiche(charge(p),n)
