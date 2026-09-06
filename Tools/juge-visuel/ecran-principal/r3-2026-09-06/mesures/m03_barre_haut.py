# m03 — la barre du haut : aile gauche (ARGENT + valeur + ratio), medaillon, aile droite.
# Controle positif : sur le canon, .medaillon doit faire 64 CSS et .aile.gauche demarrer a 17 CSS
#                    (mesure-canon.txt : medaillon 64x64 a (164,8) ; aile.gauche 96x33.55 a (17,10.22)).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755),
   ('fiche19','../capture-fiche-1080x1920.png',2.755),('fiche24','../capture-fiche-1080x2400.png',2.755)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    print(f'== {name} {w}x{h} fac={fac}')
    C=lambda v:int(round(v*fac))
    # --- encre claire dans la barre (0..52 CSS), seuil L>90
    bb,cols,rows = ink_bbox(px,(0,0,w,C(52)),90,'bright',2)
    # segmentation en colonnes : trouver les groupes de colonnes encrees
    groups=[];cur=None
    for i,c in enumerate(cols):
        if c>=2:
            if cur is None: cur=[i,i]
            else: cur[1]=i
        else:
            if cur is not None and i-cur[1]>C(4): groups.append(cur); cur=None
    if cur: groups.append(cur)
    print('   groupes de colonnes encrees dans la barre (CSS):')
    for g in groups:
        print(f'     x {g[0]:5d}..{g[1]:5d} px  =  {g[0]/fac:6.1f}..{g[1]/fac:6.1f} CSS  (largeur {(g[1]-g[0]+1)/fac:5.1f})')
