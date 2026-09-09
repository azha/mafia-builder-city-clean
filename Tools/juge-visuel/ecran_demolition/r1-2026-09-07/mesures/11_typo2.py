# -*- coding: utf-8 -*-
"""Decoupe d'une ligne de texte en RUNS de colonnes d'encre (= glyphes) puis hauteur d'encre de chaque run.
Permet de comparer la MEME lettre entre reference et capture (meme famille DejaVu des deux cotes : fc-match).
Controle POSITIF : le nombre de runs doit correspondre au nombre de glyphes lisibles du libelle."""
from PIL import Image
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2
def fond_de(px,box):
    x0,y0,x1,y1=box; R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]; R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (med(R),med(G),med(B))
def runs(px,box,fond,seuil,lab,libelle):
    x0,y0,x1,y1=box
    ink=lambda x,y: sum(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil
    cols=[(x,sum(1 for y in range(y0,y1) if ink(x,y))) for x in range(x0,x1)]
    rs=[];cur=None
    for x,n in cols:
        if n>0:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur: rs.append(tuple(cur)); cur=None
    if cur: rs.append(tuple(cur))
    print("  %s  << %s >>  : %d runs"%(lab,libelle,len(rs)))
    out=[]
    for i,(a,b) in enumerate(rs):
        ys=[y for y in range(y0,y1) if any(ink(x,y) for x in range(a,b+1))]
        if not ys: continue
        out.append((i,a,b,ys[0],ys[-1],ys[-1]-ys[0]+1))
        print("     #%02d x=%4d..%4d  y=%4d..%4d  h=%2d px (%.2f CSS)  larg=%d"%(i,a,b,ys[0],ys[-1],ys[-1]-ys[0]+1,(ys[-1]-ys[0]+1)/3.6,b-a+1))
    return out

R=Image.open("reference-1080x2102.png").convert('RGB'); pr=R.load()
C=Image.open("capture-1080x2400.png").convert('RGB'); pc=C.load()
print("OUVERT ref %s / cap %s"%(R.size,C.size))
print()
f=fond_de(pr,(700,455,1000,478))
runs(pr,(46,468,700,520),f,70,"REF h3","Ce batiment vous coute")
print()
g=fond_de(pc,(700,250,1000,278))
runs(pc,(44,270,700,325),g,70,"CAP h3","L'organisation frotte")
print()
runs(pr,(46,530,760,570),f,55,"REF p","Ce qu'il rapporte, ce qu'il gene,")
print()
runs(pc,(44,332,760,372),g,55,"CAP p","Plus vous tenez de choses,")
