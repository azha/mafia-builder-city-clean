# m18 — couleurs de la fiche : fond du panneau, bouton or (haut/bas du degrade), texte des 3 stats,
# bordure des boutons en ligne, separateurs de stats.
# Controle positif : le canon doit rendre l'or vif #f2c96b (242,201,107) sur le titre .serif
# et --braise #e0664a (224,102,74) sur la 3e stat.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
def couleur_texte(px,x0,x1,y0,y1,thr=110):
    """couleur mediane des pixels d'encre les plus clairs (coeur du glyphe)"""
    P=[px[x,y] for y in range(y0,y1) for x in range(x0,x1) if lum(px[x,y])>thr]
    if not P: return None,0
    P.sort(key=lum)
    core=P[int(len(P)*0.75):]
    R=sorted(p[0] for p in core);G=sorted(p[1] for p in core);B=sorted(p[2] for p in core)
    n=len(core)
    return (R[n//2],G[n//2],B[n//2]),len(P)
CAS=[('canon','../ecran-canon.png',3.0,424.52,
      {'titre':(124,266,21.8,33.0),'stat1':(63,106,70.5,82.6),'stat2':(174,218,70.5,82.6),'stat3':(295,321,70.5,82.6),
       'lib_stat':(51,116,93.0,99.6),'btn_texte':(161,230,125,145)}),
     ('fiche19','../capture-fiche-1080x1920.png',2.755,426.50,
      {'titre':(33,360,7.9,23.0),'stat1':(51,117,68.1,82.9),'stat2':(168,223,68.1,82.9),'stat3':(261,351,68.1,82.9),
       'lib_stat':(64,105,91.0,98.1),'btn_texte':(158,233,125,145)})]
for name,f,fac,y0,W in CAS:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}')
    for k,(a,b,c,d) in W.items():
        col,n=couleur_texte(px,C(a),C(b),C(y0+c),C(y0+d))
        print(f'   {k:10s} : {col}  (n={n} px d\'encre)')
    # fond du panneau : 4 fenetres sans texte
    for lbl,(cx,cy) in {'coin HG':(22,10),'coin HD':(370,10),'milieu G':(22,85),'milieu D':(370,85),'centre':(196,60),'bas G':(22,163)}.items():
        print(f'   fond {lbl:8s} (rel {cy}) : {median_win(px,C(cx),C(y0+cy),3)}')
    # bouton or : degrade vertical au centre du bouton 1
    print('   bouton COLLECTER, profil vertical au centre (x=81 CSS) :')
    for rel in (117,120,125,130,135,140,145,150,152):
        print(f'      rel {rel:3d} : {median_win(px,C(81),C(y0+rel),2)}')
