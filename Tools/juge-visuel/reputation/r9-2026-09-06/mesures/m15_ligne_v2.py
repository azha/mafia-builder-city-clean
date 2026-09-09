# -*- coding: utf-8 -*-
"""m15 — v2 de la ligne de balayage : colonnes SANS texte ni dessin (gouttiere entre la carte
portrait et les tuiles, et gouttiere de droite). v1 (m14) etait contaminee par l'encre des
glyphes — c'est pourquoi elle rendait (185,173,146) = creme2.
Contrôle positif : le jeton cyan #7fd4d9 (chassis6.py) ; le pic doit tirer vers le CYAN
  (B et G > R), sinon on ne mesure pas la ligne.
Contrôle négatif : la meme sonde 200 px plus bas doit rendre un pic quasi nul.
+ ronds du dock du CANON aux centres LUS dans mesure-canon.txt (x3), pas devines.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
K=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
print('REF %dx%d  CAP %dx%d  CANON %dx%d'%(R.size+C.size+K.size))
def score(c): return c[1]+c[2]-2*c[0]
def sonde(im,nom,x,ya,yb):
    px=im.load()
    vals=[(score(px[x,y]),y,px[x,y]) for y in range(ya,yb)]
    s,y,c=max(vals)
    base=sorted(v[0] for v in vals)[len(vals)//4]
    seuil=base+(s-base)/2
    a=y
    while a>ya and score(px[x,a])>=seuil: a-=1
    b=y
    while b<yb-1 and score(px[x,b])>=seuil: b+=1
    print('  %s x=%4d : pic y=%4d couleur %-16s score=%3d (base %3d) epaisseur mi-h=%2d px (%.2f CSS)'
          %(nom,x,y,str(c),s,base,b-a-1,(b-a-1)/3.6))
    return y,c,s
print('LIGNE DE BALAYAGE — colonnes propres')
for x in (520,1012):
    sonde(R,'REF',x,960,1120)
for x in (515,1020):
    sonde(C,'CAP',x,760,920)
print('  contrôle négatif (200 px plus bas, meme colonne)')
sonde(R,'REF',520,1200,1320); sonde(C,'CAP',515,1000,1120)
print()
print('CANON HUD — ronds du dock, centres LUS (mesure-canon.txt : .rond 46x46 a (71,615.7), x3)')
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def disque(im,cx,cy,r,nom):
    px=im.load();n=0;tot=0;mx=0
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            if (x-cx)**2+(y-cy)**2<=(r*0.70)**2:
                tot+=1;l=lum(px[x,y]);mx=max(mx,l)
                if l>=80: n+=1
    print('   %-18s encre=%d/%d px (%.1f%%)  lum max=%.0f'%(nom,n,tot,100*n/tot,mx))
# 4 ronds : pas de 68 CSS environ -> on les localise par balayage du contour clair
for i,cx in enumerate((282,487,691,895)):
    disque(K,cx,1916,60,'canon rond %d'%(i+1))
print('CAPTURE — memes ronds (centres lus sur l image)')
for i,cx in enumerate((259,447,634,821)):
    disque(C,cx,2243,60,'cap rond %d'%(i+1))
