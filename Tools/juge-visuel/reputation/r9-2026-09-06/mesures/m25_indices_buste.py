# -*- coding: utf-8 -*-
"""m25 — les quatre indices PORTES par le buste, confrontes aux quatre tuiles :
 montre (rect or_vif a droite, unites x46..54) · manchettes (rects creme aux bras, unites
 x9..16 et x47..54 — presentes SEULEMENT dans le cadre #121 'manches roulees') ·
 gants (ellipse #232a2d en bas a gauche, unite cx=12) · col (triangle creme, largeur).
+ re-placement du contrôle négatif de m24 (le precedent tombait sur le bas du titre).
Contrôle positif : le col a deja ete mesure (m12) : 61 px en REF (col ouvert, base 14 u)
  contre 37 px en CAP (col boutonne, base 8 u) — rapport attendu 14/8, mesure 1,65.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def prox(p,q,t): return all(abs(p[k]-q[k])<=t for k in range(3))
def trouve(im,box,cible,tol,nom):
    px=im.load();x0,y0,x1,y1=box;xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if prox(px[x,y],cible,tol): xs.append(x);ys.append(y)
    if not xs: print('   %-38s ABSENT (0 px)'%nom); return None
    print('   %-38s x=%d..%d y=%d..%d  %dx%d px  n=%d'%(nom,min(xs),max(xs),min(ys),max(ys),
          max(xs)-min(xs)+1,max(ys)-min(ys)+1,len(xs)))
    return (min(xs),max(xs))
ORV=(0xf2,0xc9,0x6b); CREME=(0xea,0xe0,0xc8); GANT=(0x23,0x2a,0x2d)
print('REFERENCE (cadre #120 : 4 voyants eteints ; ni montre ni manchettes)')
trouve(R,(86,1150,502,1420),ORV,40,'montre (or_vif) dans le buste')
trouve(R,(86,1240,502,1330),CREME,10,'manchettes (creme aux bras)')
trouve(R,(86,1280,502,1420),GANT,10,'gants (ellipse #232a2d)')
print('CAPTURE (02/4 : col boutonne + montre visible allumes)')
trouve(C,(76,940,492,1210),ORV,40,'montre (or_vif) dans le buste')
trouve(C,(76,1030,492,1120),CREME,10,'manchettes (creme aux bras)')
trouve(C,(76,1070,492,1210),GANT,10,'gants (ellipse #232a2d)')
print()
print('contrôle négatif re-place (aplat entre le titre et le sous-titre)')
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
for nom,im,x0,x1,y0,y1 in (('REF',R,148,430,566,584),('CAP',C,195,830,368,392)):
    px=im.load()
    ys=[y for y in range(y0,y1) if sum(1 for x in range(x0,x1) if lum(px[x,y])>=70)>=3]
    print('   %s aplat y=%d..%d : %d ligne(s) d encre'%(nom,y0,y1,len(ys)))
