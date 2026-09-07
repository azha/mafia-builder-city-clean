"""m12 — M2 : la carte portrait sort-elle du panneau elastique ?
Bord du panneau : mi-alpha du bord clair, mesure DANS la colonne DROITE (x 520..1020),
la ou la carte ne peut pas le masquer.  Bord de la carte : mi-alpha du filet OR.
Controle positif : le bord HAUT du panneau doit sortir au meme y que celui trouve par m04.
Controle negatif : la meme sonde 60 px plus bas (fond nu) ne doit trouver aucun bord.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def est_or(c):
    r,g,b=c
    return r>110 and (r-b)>45 and g>70 and g<r

CAS={
 'reference-1080x2102.png': dict(xd=(520,1020), bas=(1580,1660), haut=(830,880), carte=1531),
 'capture-1080x2400.png'  : dict(xd=(520,1020), bas=(1510,1600), haut=(860,900), carte=1558),
 'capture-1080x1920.png'  : dict(xd=(520,1020), bas=(1280,1360), haut=(628,668), carte=1326),
}
for nom,c in CAS.items():
    print("="*74); im=ouvrir(nom); p=im.load()
    x0,x1=c['xd']
    for lab,(y0,y1) in (('HAUT',c['haut']),('BAS',c['bas'])):
        prof=[(y, sum(lum(p[x,y]) for x in range(x0,x1+1))/(x1-x0+1)) for y in range(y0,y1+1)]
        vals=[v for _,v in prof]
        pic=max(vals); i=vals.index(pic); fond=percentile(vals,10)
        m=mi_alpha(prof,i,+1,fond=fond,pic=pic); mm=mi_alpha(prof,i,-1,fond=fond,pic=pic)
        print(f"  bord {lab} du panneau : pic y={prof[i][0]} ({pic:.1f}), mi-alpha ext={mm:.1f} int={m:.1f}")
        if lab=='BAS': ybas=m
    # filet OR bas de la carte
    cy=c['carte']
    prof=[(y, sum(1 for x in range(70,510) if est_or(p[x,y]))) for y in range(cy-14,cy+14)]
    vals=[v for _,v in prof]; pic=max(vals); i=vals.index(pic)
    ext=mi_alpha(prof,i,+1,fond=0.0,pic=pic)
    print(f"  filet OR BAS de la carte : mi-alpha exterieur = {ext:.1f}")
    print(f"  >>> carte - panneau = {ext-ybas:+.1f} px  ({'la carte DEPASSE' if ext>ybas else 'la carte est DEDANS'})")
    # ctrl negatif
    y0=int(ybas)+40
    prof2=[(y, sum(lum(p[x,y]) for x in range(x0,x1+1))/(x1-x0+1)) for y in range(y0,y0+30)]
    v=[q for _,q in prof2]
    print(f"  [ctrl negatif] 40 px sous le bord bas : amplitude du profil = {max(v)-min(v):.2f} pts (attendu petit)")
