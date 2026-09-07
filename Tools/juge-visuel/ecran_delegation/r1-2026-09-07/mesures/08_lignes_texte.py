#!/usr/bin/env python3
"""Segmente les LIGNES de texte d'une fenetre (projection horizontale de l'encre) et donne
pour chacune sa bbox + sa hauteur d'x (bande sans ascendante) quand demande.
Controle positif : la 1re ligne du h3 (.sv-tete h3) doit avoir la MEME largeur d'encre
en REF et en CAP a <=2 % (meme texte, meme police DejaVu Serif, meme echelle x3,6).
Controle negatif : deux textes DIFFERENTS ('vous la faites' vs 'vous apprenez encore')
doivent, eux, differer de >2 %."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def lignes(im,x0,y0,x1,y1,seuil=18):
    px=im.load()
    vals=sorted(lum(px[x,y]) for y in range(y0,y1,3) for x in range(x0,x1,3))
    fond=vals[len(vals)//2]
    rows=[]
    for y in range(y0,y1):
        c=sum(1 for x in range(x0,x1) if abs(lum(px[x,y])-fond)>seuil)
        rows.append(c)
    out=[];cur=None
    for i,c in enumerate(rows):
        if c>0:
            if cur is None: cur=[i,i]
            else: cur[1]=i
        else:
            if cur is not None and cur[1]-cur[0]>=4: out.append(cur)
            cur=None
    if cur is not None and cur[1]-cur[0]>=4: out.append(cur)
    res=[]
    for a,b in out:
        xs=[x for x in range(x0,x1) for y in range(y0+a,y0+b+1) if abs(lum(px[x,y])-fond)>seuil]
        res.append((y0+a,y0+b,min(xs),max(xs)))
    return res,fond
def show(im,tag,nom,box,seuil=18):
    r,f=lignes(im,*box,seuil)
    print(f"  [{tag}] {nom}  (fond lum={f:.1f})")
    for y0,y1,x0,x1 in r:
        print(f"      ligne y={y0}..{y1} (h={y1-y0+1:3d})  x={x0}..{x1} (l={x1-x0+1:4d})")
    return r
ref=Image.open(D+"reference-1080x2102.png").convert("RGB")
cap=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("REF",ref.size,"CAP",cap.size)
print("\n=== jeton : b (gras or) ===")
a=show(ref,"REF","b",(140,655,520,800),12); b=show(cap,"CAP","b",(120,445,600,555),12)
print("=== jeton : i (droite) ===")
show(ref,"REF","i",(540,655,1000,800),12); show(cap,"CAP","i",(600,445,1000,555),12)
print("=== jeton : rond seul ===")
show(ref,"REF","rond",(60,655,175,800),12); show(cap,"CAP","rond",(55,445,128,555),12)
print("\n=== sv-tete h3 + p ===")
show(ref,"REF","h3+p",(45,450,1035,600),22); show(cap,"CAP","h3+p",(35,250,1045,393),22)
print("\n=== plaque1 gauche (q) ===")
show(ref,"REF","q",(150,860,700,980),14); show(cap,"CAP","q",(145,620,700,742),14)
print("=== plaque1 droite (tenu) ===")
show(ref,"REF","tenu",(700,860,1025,980),14); show(cap,"CAP","tenu",(700,620,1028,742),14)
print("\n=== sv-dit ===")
show(ref,"REF","dit",(45,1795,1035,1930),20); show(cap,"CAP","dit",(35,1865,1045,1985),20)
print("\n=== CTA interieur ===")
show(ref,"REF","cta",(60,1945,1020,2036),20); show(cap,"CAP","cta",(58,2000,1022,2092),20)
print("\n=== titron EN TROP (capture seulement) ===")
show(cap,"CAP","titron",(35,1215,1050,1275),12)
