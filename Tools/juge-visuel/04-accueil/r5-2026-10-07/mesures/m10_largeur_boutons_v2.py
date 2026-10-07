# m10 — largeur des boutons, fond de reference PRIS SUR LA MEME LIGNE (le verre du panneau est
# en degrade vertical : un fond fixe produit de faux bords).
# Controle positif : les 3 boutons d'une meme image partagent leur bord DROIT.
# Controle negatif : la ligne du separateur, qui traverse tout, doit rendre une largeur > 800.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
BANDES={'REF':[(945,1036),(1159,1250),(1418,1509)],
        'JEU1920':[(865,956),(1050,1142),(1275,1367)],
        'JEU2400':[(1271,1363),(1456,1548),(1682,1774)]}
SEP={'REF':1075,'JEU1920':1198,'JEU2400':1401}
def med(v): v=sorted(v); return v[len(v)//2]
def fond_ligne(px,y): return tuple(med([px[x,y][i] for x in range(1008,1028)]) for i in range(3))
def bords(px,y,tol=3):
    f=fond_ligne(px,y)
    est=lambda p: all(abs(p[i]-f[i])<=tol for i in range(3))
    try: d=next(x for x in range(1028,600,-1) if not est(px[x,y]))
    except StopIteration: return None,None,f
    g=None;r=0
    for x in range(d,520,-1):
        if est(px[x,y]):
            r+=1
            if r>=12: g=x+12; break
        else: r=0
    return g,d,f
def fiche(im,nom):
    px=im.load(); print(f'  --- {nom} ---')
    for i,(y0,y1) in enumerate(BANDES[nom],1):
        ym=(y0+y1)//2
        g,d,f=bords(px,ym)
        print(f'    B{i}: x {g}..{d} largeur={d-g+1} hauteur={y1-y0+1} margeD={1032-d} (fond ligne {f})')
        prof=[]
        for k in (0,1,2,3,4,6,8,10,12,16,20,24,30):
            gg,dd,_=bords(px,y0+k)
            prof.append(f'{k}:{dd-gg+1}' if gg else f'{k}:-')
        print(f'      largeur(y0+k): {prof}')
    gg,dd,f=bords(px,SEP[nom])
    print(f'    CONTROLE NEGATIF separateur y={SEP[nom]}: x {gg}..{dd} largeur={None if gg is None else dd-gg+1}')
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: fiche(charge(p),n)
