"""m03 — le cadre et son vide.
Grandeurs : filets du cadre (mi-alpha), 1er contenu, dernier contenu, gardes haut/bas,
occupation du cadre. Tout converti en CSS a 3,6 px/CSS.
Convention de bord : mi-alpha.
Controle positif : la largeur hors-tout du cadre (rails gauche/droite) doit valoir ~1038 px
                   dans la reference (grandeur connue egale au r14).
Controle negatif : une bande hors cadre (fond nu) doit rendre 0 bloc de contenu.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

def est_or(c):
    r,g,b=c
    return r>110 and (r-b)>45 and g>70 and g<r

def filets(im, W):
    p=im.load(); H=im.size[1]
    rows=[(y, sum(1 for x in range(W) if est_or(p[x,y]))) for y in range(H)]
    return rows

def mi(rows, i0, i1, sens):
    sub=[(y,n) for y,n in rows[i0:i1+1]]
    return sub

def bord_mialpha(rows, ycentre, sens, fond=0.0):
    """rows=[(y,n)] ; pic au centre ; croisement a mi-hauteur vers sens."""
    vals={y:n for y,n in rows}
    pic=max(vals[y] for y in range(ycentre-4,ycentre+5) if y in vals)
    mid=(pic+fond)/2.0
    y=ycentre
    while (y+sens) in vals and vals[y+sens]>=mid: y+=sens
    v1=vals[y]; v2=vals.get(y+sens, fond)
    if v1==v2: return float(y)
    t=(v1-mid)/(v1-v2)
    return y+t*sens

def contenu_lignes(im, x0, x1, y0, y1, seuil=14):
    """rangees ou l'ecart au fond local (p10 de la rangee) depasse seuil, sur >=6 px"""
    p=im.load()
    out=[]
    for y in range(y0,y1+1):
        vals=[lum(p[x,y]) for x in range(x0,x1+1)]
        f=percentile(vals,10)
        n=sum(1 for v in vals if v-f>seuil)
        out.append((y,n))
    return out

CFG = {
 'reference-1080x2102.png': dict(top=453, bot=2077),
 'capture-1080x2400.png'  : dict(top=483, bot=2107),
 'capture-1080x1920.png'  : dict(top=251, bot=1627),
}

for nom,cfg in CFG.items():
    print("="*74)
    im=ouvrir(nom); W,H=im.size
    rows=filets(im,W)
    ytop_out=bord_mialpha(rows,cfg['top'],-1); ytop_in=bord_mialpha(rows,cfg['top'],+1)
    ybot_in =bord_mialpha(rows,cfg['bot'],-1); ybot_out=bord_mialpha(rows,cfg['bot'],+1)
    print(f"  filet HAUT  mi-alpha ext={ytop_out:.1f} int={ytop_in:.1f}  (ep={ytop_in-ytop_out:.1f})")
    print(f"  filet BAS   mi-alpha int={ybot_in:.1f} ext={ybot_out:.1f}  (ep={ybot_out-ybot_in:.1f})")
    hors=ybot_out-ytop_out; dedans=ybot_in-ytop_in
    print(f"  cadre hors-tout = {hors:.1f} px = {hors/3.6:.2f} CSS   |  interieur = {dedans:.1f} px = {dedans/3.6:.2f} CSS")
    # rails verticaux (colonnes or) sur la hauteur du cadre
    p=im.load()
    cols=[(x, sum(1 for y in range(int(ytop_in)+20,int(ybot_in)-20) if est_or(p[x,y]))) for x in range(W)]
    n=int(ybot_in-ytop_in)-40
    b=bandes(cols,int(0.6*n))
    print(f"  rails verticaux : {[(c0,c1) for c0,c1,_ in b]}")
    if len(b)>=2:
        xg=(b[0][0]+b[0][1])/2; xd=(b[-1][0]+b[-1][1])/2
        print(f"  largeur hors-tout cadre (centre a centre des rails) = {xd-xg:.1f} px ; marges ecran = {b[0][0]} / {W-1-b[-1][1]}")
    # contenu : premiere et derniere rangee "d'encre" strictement DANS le cadre
    x0,x1=int(b[0][1])+6, int(b[-1][0])-6
    cl=contenu_lignes(im,x0,x1,int(ytop_in)+2,int(ybot_in)-2)
    enc=[y for y,nn in cl if nn>=6]
    print(f"  contenu : 1ere rangee d'encre y={enc[0]}  derniere y={enc[-1]}  (hauteur {enc[-1]-enc[0]+1} px = {(enc[-1]-enc[0]+1)/3.6:.2f} CSS)")
    gh=enc[0]-ytop_in; gb=ybot_in-enc[-1]
    print(f"  garde HAUT (filet int -> 1er contenu) = {gh:.1f} px = {gh/3.6:.2f} CSS")
    print(f"  garde BAS  (dernier contenu -> filet int) = {gb:.1f} px = {gb/3.6:.2f} CSS")
    print(f"  VIDE total dans le cadre (gardes h+b) = {(gh+gb):.1f} px = {(gh+gb)/3.6:.2f} CSS")
    print(f"  occupation du cadre par le contenu = {100*(enc[-1]-enc[0]+1)/dedans:.1f} %")
    # controle negatif : bande hors cadre
    if nom!='capture-1080x1920.png':
        yy=int(ytop_out)-60
        cl2=contenu_lignes(im,x0,x1,yy-20,yy+20)
        print(f"  [ctrl negatif] hors cadre y{yy-20}..{yy+20} : rangees d'encre = {sum(1 for _,nn in cl2 if nn>=6)} (attendu 0)")
