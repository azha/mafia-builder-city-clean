# -*- coding: utf-8 -*-
"""m13 — APLATS : mediane d'une fenetre 21x21 prise a >=3 px de tout bord, pour chaque
surface nommee par la CSS. Colonne 'voulu' = le jeton recopie de chassis6.py / rep6 CSS.
Contrôle positif : .pann (#111823) et .cta6 (#16191b) sont OPAQUES => doivent tomber a
  <=6/255 par canal des deux cotes.
Contrôle négatif : .fen (#0a0e16) et .elast (#0d0f10) sont des valeurs DIFFERENTES de
  #111823 — si l'instrument rendait la meme chose partout il ne mesurerait rien.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def med(im,cx,cy,r=10):
    px=im.load(); ch=[[],[],[]]
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            c=px[x,y]
            for k in range(3): ch[k].append(c[k])
    return tuple(sorted(v)[len(v)//2] for v in ch)
def hx(c): return '#%02x%02x%02x'%c
def duo(nom,voulu,pr,pc):
    a=med(R,*pr); b=med(C,*pc)
    v=tuple(int(voulu[i:i+2],16) for i in (1,3,5))
    dr=max(abs(a[i]-v[i]) for i in range(3)); dc=max(abs(b[i]-v[i]) for i in range(3))
    dd=max(abs(b[i]-a[i]) for i in range(3))
    print('%-24s voulu %s | REF %s (d=%2d) | CAP %s (d=%2d) | REF->CAP dmax=%2d  %s'
          %(nom,voulu,hx(a),dr,hx(b),dc,dd,'' if dd<=6 else '  <<< ECART'))
# points pris au centre de zones plates, >=3px de tout bord (reperes m01/m03/m04/m05)
duo('.prt fond (carte)',      '#111823',(140,1000),(130,790))
duo('.elast fond (fond2)',    '#0d0f10',(300,1580),(300,1390))
duo('.tl OFF fond (carte)',   '#111823',(960,1165),(970,920))
duo('.fen fond (creux)',      '#0a0e16',(200,745),(200,540))
duo('.pann fond (carte)',     '#111823',(950,1690),(960,1500))
duo('.cta6 fond (carte2)',    '#16191b',(150,1998),(150,1800))
duo('.enseigne fond (translucide)','#0b111b',(120,500),(120,300))
duo('.rep6 fond bas (fond2)', '#0d0f10',(540,2060),(540,1860))
duo('torse (carte2)',         '#16191b',(300,1330),(300,1110))
print()
# tuile ALLUMEE : uniquement en CAP (le cadre #120 n en a pas) -> temoin = cadre #119 (etats/)
E=Image.open(os.path.join(D,'etats','m-119.png')).convert('RGB')
print('temoin #119 (etats/m-119.png) %dx%d — echelle x3,0'%E.size)
print('  .tl ON fond  voulu #16191b  CAP %s'%hx(med(C,970,800)))
