#!/usr/bin/env python3
"""Typographie v2 — le 10 mesurait des bbox CONTAMINEES (la fenetre etroite prenait aussi la
2e ligne ; 'LA REPUTATION' prenait le medaillon du chrome ; 'LA DISTRIBUTION' prenait les
pastilles du dock). Ici : profil d'encre LIGNE PAR LIGNE, puis segmentation en lignes de texte,
puis hauteur de capitale mesuree sur la SEULE 1re ligne, dans une fenetre x SANS descendante.
Controle positif : le nombre de lignes de texte trouve doit valoir 2 pour une carte a sous-titre
et 1 pour une carte sans sous-titre (Aide - A propos)."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"ouvre reference {R.size} / capture {C.size}")
rp,cp=R.load(),C.load()
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def lignes(px,x0,x1,y0,y1,test,seuil=2):
    prof=[sum(1 for x in range(x0,x1) if test(px[x,y])) for y in range(y0,y1)]
    out=[];cur=None
    for i,v in enumerate(prof):
        if v>=seuil and cur is None: cur=i
        if v<seuil and cur is not None:
            if i-cur>=4: out.append((y0+cur,y0+i-1))
            cur=None
    if cur is not None: out.append((y0+cur,y1-1))
    return out

print("\n[REF] lignes de texte dans chaque carte (x 205..1000, encre lum<110)")
CARTES={'Le registre du matin':(548,677),'La planche d ordres':(696,825),'Les telegrammes':(843,972),
        'La chaufferie':(984,1151),'Les inspections':(1234,1363),'Les commissariats':(1381,1510),
        'Le zinc':(1529,1658),'Le coffre-fort':(1748,1877),'Aide . A propos':(1896,2025)}
for nom,(a,b) in CARTES.items():
    ls=lignes(rp,205,1000,a,b,lambda c:L(c)<110)
    print(f"   {nom:22s} {len(ls)} ligne(s) : {ls}")

print("\n[REF] hauteur de CAPITALE du titre — fenetre x du 1er mot, 1re ligne seulement")
FEN={'Le registre du matin':(548,677,208,242),'Les inspections':(1234,1363,208,242),
     'Les commissariats':(1381,1510,208,242),'Le coffre-fort':(1748,1877,208,242)}
for nom,(a,b,x0,x1) in FEN.items():
    ls=lignes(rp,205,1000,a,b,lambda c:L(c)<110)
    ya,yb=ls[0]
    pts=[(x,y) for y in range(ya,yb+1) for x in range(x0,x1) if L(rp[x,y])<110]
    hh=max(p[1] for p in pts)-min(p[1] for p in pts)+1
    print(f"   {nom:22s} 1re ligne y {ya}..{yb} ; 'L' initial : y {min(p[1] for p in pts)}..{max(p[1] for p in pts)}  CAP={hh} px = {hh/3.6:.1f} CSS")

print("\n[JEU] hauteur de CAPITALE des libelles — rangees SANS chrome par-dessus (2..16)")
RANG=[(266,374,'LA REVUE DU JOUR'),(389,497,'LA VENTE'),(512,619,'LA VITRINE'),
      (634,742,'LES INSPECTIONS'),(757,865,'LE COMMISSARIAT'),(879,987,'LA SEMAINE'),
      (1002,1110,'LE DOSSIER'),(1493,1600,'VOTRE PROFIL'),(1983,2091,"LA CHAINE D'APPRO")]
for a,b,nom in RANG:
    ls=lignes(cp,0,1080,a,b,lambda c:L(c)>95)
    pts=[(x,y) for y in range(a,b) for x in range(1080) if L(cp[x,y])>95]
    if pts:
        y0=min(p[1] for p in pts); y1=max(p[1] for p in pts)
        x0=min(p[0] for p in pts); x1=max(p[0] for p in pts)
        print(f"   {nom:20s} {len(ls)} ligne(s) ; encre y {y0}..{y1} CAP={y1-y0+1} px = {(y1-y0+1)/3.6:.1f} CSS ; x {x0}..{x1} ; centre y encre={(y0+y1)/2:.1f} centre rangee={(a+b)/2:.1f}")
