# -*- coding: utf-8 -*-
"""m14 — (1) les 4 ronds du dock de la CAPTURE contiennent-ils de l'encre ?
        (2) la ligne de balayage cyan (.elast::after) : position, epaisseur, pic, etendue.
Contrôle positif (1) : le meme detecteur applique au canon du HUD (ecran-canon.png) DOIT
  trouver de l'encre dans ses ronds — sinon le detecteur ne mesure rien.
Contrôle positif (2) : le jeton cyan #7fd4d9 recopie de chassis6.py.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
K=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
print('CAP %dx%d  REF %dx%d  CANON %dx%d'%(C.size+R.size+K.size))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def encre_disque(im,cx,cy,r,seuil,nom):
    px=im.load();n=0;tot=0;mx=0
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            if (x-cx)**2+(y-cy)**2<=(r*0.72)**2:
                tot+=1;l=lum(px[x,y]);mx=max(mx,l)
                if l>=seuil: n+=1
    print('   %-22s coeur=%d px, encre(lum>=%d)=%d px (%.1f%%), lum max=%.0f'%(nom,tot,seuil,n,100*n/tot,mx))
    return n
print('CAPTURE — ronds du dock (centres lus sur l image, r=63)')
for i,cx in enumerate((259,447,634,821)):
    encre_disque(C,cx,2243,63,80,'rond %d'%(i+1))
print('CANON HUD — contrôle positif (ronds a y=1615/3 ... echelle x3 : rond1 cx=(71+23)*3=282)')
for i,cx in enumerate((282,447,613,779)):
    encre_disque(K,cx,1922,63,80,'canon rond %d'%(i+1))
print()
print('LIGNE DE BALAYAGE cyan (.elast::after)')
CY=(0x7f,0xd4,0xd9)
def ligne(im,nom,x,ya,yb):
    px=im.load();best=None
    for y in range(ya,yb):
        c=px[x,y]
        # ecart au fond : on cherche le maximum de composante verte+bleue
        s=c[1]+c[2]-c[0]
        if best is None or s>best[0]: best=(s,y,c)
    print('   %s  colonne x=%d : pic a y=%d  couleur %s (cyan voulu %s)'%(nom,x,best[1],best[2],CY))
    y=best[1]
    # epaisseur : lignes ou (G+B-R) depasse la moitie du pic au-dessus du fond
    fond=px[x,ya][1]+px[x,ya][2]-px[x,ya][0]
    seuil=fond+(best[0]-fond)/2
    a=y
    while a>ya and px[x,a][1]+px[x,a][2]-px[x,a][0]>=seuil: a-=1
    b=y
    while b<yb-1 and px[x,b][1]+px[x,b][2]-px[x,b][0]>=seuil: b+=1
    print('        epaisseur a mi-hauteur = %d px (%.2f CSS)   fond de reference %s'%(b-a-1,(b-a-1)/3.6,px[x,ya]))
    return best[1]
for x in (300,700,950):
    ligne(R,'REF',x,960,1120)
for x in (300,700,950):
    ligne(C,'CAP',x,760,900)
