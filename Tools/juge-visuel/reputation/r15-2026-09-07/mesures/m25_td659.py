"""m25 (v2) — TD-659 : garde entre le LOSANGE du chrome et le premier contenu de l'ecran.
v1 mesurait le CERCLE ROUGE du medaillon (R-B fort lui aussi) : la sonde est passee a un
masque de LAITON strict (R>110, R-B>45, G<R, G>70) compte par rangee, fenetre y205..248.
Bord : mi-alpha du compte par rangee/colonne.
Controle positif : le losange doit sortir a la MEME place sur les 3 planches du meme commit.
Controle negatif : la meme sonde en y300..340 (fond nu a 2400) doit rendre 0.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def est_or(c):
    r,g,b=c; return r>110 and (r-b)>45 and g>70 and g<r
CAS={'capture-1080x2400.png':481.5,'capture-1080x1920.png':249.5,'temoin-menu-plus-1080x2400.png':None}
for nom,ycadre in CAS.items():
    im=ouvrir(nom); p=im.load()
    prof=[(y, sum(1 for x in range(510,570) if est_or(p[x,y]))) for y in range(205,248)]
    vals=[v for _,v in prof]; pic=max(vals); i=vals.index(pic)
    h=mi_alpha(prof,i,-1,fond=0.0,pic=pic); b=mi_alpha(prof,i,+1,fond=0.0,pic=pic)
    col=[(x, sum(1 for y in range(205,248) if est_or(p[x,y]))) for x in range(510,570)]
    cv=[v for _,v in col]; cp=max(cv); ci=cv.index(cp)
    g=mi_alpha(col,ci,-1,fond=0.0,pic=cp); d=mi_alpha(col,ci,+1,fond=0.0,pic=cp)
    print(f"  {nom}")
    print(f"    losange mi-alpha : y {h:.1f}..{b:.1f} (h={b-h:.1f})  x {g:.1f}..{d:.1f} (w={d-g:.1f})  centre=({(g+d)/2:.1f},{(h+b)/2:.1f})")
    print(f"      (canon : carre 7x7 CSS tourne a 45deg => diagonale 9,90 CSS = {9.90*2.755:.1f} px client ; bas a 82 CSS = {82*2.755:.1f} px)")
    if ycadre:
        print(f"    filet HAUT du cadre (ext) = {ycadre:.1f}  =>  GARDE = {ycadre-b:.1f} px = {(ycadre-b)/2.755:.1f} CSS-HUD")
    else:
        rows=[(y,sum(1 for x in range(25,1055) if lum(p[x,y])>40)) for y in range(int(b)+2,420)]
        prem=[y for y,n in rows if n>=20]
        print(f"    (temoin ⑱) premiere encre large sous le losange : y={prem[0] if prem else None} => garde {prem[0]-b:.1f} px")
    n=sum(1 for y in range(300,341) for x in range(510,570) if est_or(p[x,y]))
    print(f"    [ctrl negatif] laiton en y300..340 = {n}")
