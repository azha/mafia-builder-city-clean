# -*- coding: utf-8 -*-
"""m20 — (a) le FOND du cadre .rep6 : profil vertical de luminance dans la gouttiere gauche
(entre le filet .cerne et le bord des blocs), la ou aucun contenu ne passe. La CSS demande
un halo OR en haut (radial 72%x40% a 50%/22%, rgba(217,171,78,.15)) et un halo CYAN en bas
(rgba(127,212,217,.07)) par-dessus un degrade #111823 -> #0b1016 -> #0d0f10.
(b) COUVERTURE DE PALETTE opposable : part d'aire a moins de 12/255 par canal de chaque jeton
(m13 montrait que quantize() n'est PAS comparable d'une image a l'autre — bins differents).
Contrôle positif (b) : la somme des parts doit etre du meme ordre des deux cotes.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def med(im,cx,cy,r=4):
    p=im.load();ch=[[],[],[]]
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            for k in range(3): ch[k].append(p[x,y][k])
    return tuple(sorted(v)[len(v)//2] for v in ch)
print('(a) fond du cadre — gouttiere gauche (REF x=35, CAP x=32), par 10%% de la hauteur du cadre')
for nom,im,x,y0,y1 in (('REF',R,35,452,2078),('CAP',C,32,250,1876)):
    out=[]
    for k in range(0,11):
        y=int(y0+(y1-y0)*k/10.0); y=min(max(y,y0+6),y1-6)
        c=med(im,x,y); out.append('%d%%:#%02x%02x%02x(L%.0f)'%(k*10,c[0],c[1],c[2],lum(c)))
    print('   %s %s'%(nom,' '.join(out)))
print()
T={'fond':'#0b1016','fond2':'#0d0f10','carte':'#111823','carte2':'#16191b','rang':'#232a2d',
   'lisere':'#2a3648','creux':'#0a0e16','creme':'#eae0c8','creme2':'#b9ad92','muet':'#8a979c',
   'eteint':'#6b737d','or':'#d9ab4e','or_vif':'#f2c96b','or_filet':'#b08d3e','cyan':'#7fd4d9','vert':'#7db36a'}
def couverture(im,box,pas=2):
    p=im.load();x0,y0,x1,y1=box;tot=0;cnt={k:0 for k in T}
    cib={k:tuple(int(v[i:i+2],16) for i in (1,3,5)) for k,v in T.items()}
    for y in range(y0,y1,pas):
        for x in range(x0,x1,pas):
            c=p[x,y];tot+=1
            for k,q in cib.items():
                if abs(c[0]-q[0])<=12 and abs(c[1]-q[1])<=12 and abs(c[2]-q[2])<=12:
                    cnt[k]+=1;break
    return tot,cnt
tr,cr=couverture(R,(24,454,1056,2076))
tc,cc=couverture(C,(21,252,1059,1874))
print('(b) couverture de palette (tol 12/255 par canal, un pixel compte une seule fois)')
print('   %-10s %8s %8s   %s'%('jeton','REF %','CAP %','delta'))
s1=s2=0
for k in T:
    a=100*cr[k]/tr; b=100*cc[k]/tc; s1+=a; s2+=b
    if a>0.2 or b>0.2:
        print('   %-10s %7.2f%% %7.2f%%   %+.2f'%(k,a,b,b-a))
print('   %-10s %7.2f%% %7.2f%%'%('TOTAL',s1,s2))
