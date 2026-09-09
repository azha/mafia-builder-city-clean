#!/usr/bin/env python3
"""Contraste texte/fond (WCAG, sRGB) sur l'art reel.
Encre = mediane des pixels du CŒUR des glyphes (erosion 1 px : un pixel n'est encre que si ses
4 voisins le sont aussi) — evite la frange d'anti-crenelage, cause connue de faux contrastes.
Controle positif : le contraste NOIR PUR / BLANC PUR doit rendre 21.00."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"ouvre reference {R.size} / capture {C.size}")
rp,cp=R.load(),C.load()
def lin(u):
    u=u/255.0
    return u/12.92 if u<=0.04045 else ((u+0.055)/1.055)**2.4
def Lr(c): return 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2])
def ratio(a,b):
    la,lb=Lr(a),Lr(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
print(f"CONTROLE POSITIF noir/blanc = {ratio((0,0,0),(255,255,255)):.2f} (attendu 21.00)")
def coeur(px,x0,x1,y0,y1,test):
    ok=[(x,y) for y in range(y0+1,y1-1) for x in range(x0+1,x1-1)
        if test(px[x,y]) and test(px[x-1,y]) and test(px[x+1,y]) and test(px[x,y-1]) and test(px[x,y+1])]
    if not ok: return None,0
    vals=sorted((px[x,y] for x,y in ok), key=lambda c:0.2126*c[0]+0.7152*c[1]+0.0722*c[2])
    return vals[len(vals)//2], len(ok)
def Lu(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

print("\n[REF] titre de carte 'Les inspections' (y 1265..1300, x 205..700)")
e,n=coeur(rp,205,700,1262,1300,lambda c:Lu(c)<110)
print(f"   encre coeur={e} ({n} px) ; fond={rp[700,1290]} ; contraste={ratio(e,rp[700,1290]):.2f}:1")
print("[REF] sous-titre 'par district' (y 1313..1345)")
e2,n2=coeur(rp,205,700,1310,1348,lambda c:Lu(c)<140)
print(f"   encre coeur={e2} ({n2} px) ; contraste={ratio(e2,rp[700,1330]):.2f}:1")
print("[REF] intertitre 'LA VILLE' (y 1185..1208)")
e3,n3=coeur(rp,70,240,1183,1210,lambda c:c[0]>110 and c[0]-c[2]>25)
print(f"   encre coeur={e3} ({n3} px) ; fond={rp[400,1195]} ; contraste={ratio(e3,rp[400,1195]):.2f}:1")

print("\n[JEU] libelles de rangee")
for a,b,nom in [(266,374,'LA REVUE DU JOUR'),(634,742,'LES INSPECTIONS'),(1983,2091,"LA CHAINE D'APPRO")]:
    e,n=coeur(cp,380,700,a,b,lambda c:Lu(c)>95)
    fond=cp[20,(a+b)//2]
    print(f"   {nom:20s} encre coeur={e} ({n} px) ; fond={fond} ; contraste={ratio(e,fond):.2f}:1")
print("[JEU] libelle sous le dock 'LA LOI' (rangee 18)")
e,n=coeur(cp,480,610,2228,2336,lambda c:Lu(c)>95)
if e: print(f"   encre coeur={e} ({n} px) ; fond={cp[20,2282]} ; contraste={ratio(e,cp[20,2282]):.2f}:1")
else: print("   pas de coeur d'encre isolable (texte trop petit/occlus)")
