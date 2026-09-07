# -*- coding: utf-8 -*-
"""Hauteur de CAPITALE mesuree sur la 1re lettre (sans jambage ni accent), par colonnes d'encre.
Controle POSITIF : REF .dm-tete h3 = 700 12px 'DejaVu Serif' -> capitale DejaVu Serif Bold = 0,729 em
   => 12 x 0,729 = 8,75 CSS x3,6 = 31,5 px attendus.
Controle NEGATIF : la meme sonde sur une bande SANS texte doit rendre 0 colonne d'encre."""
from PIL import Image
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2
def fond_de(px,box):
    x0,y0,x1,y1=box; R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]; R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (med(R),med(G),med(B))
def lettre(px,box,fond,seuil,lab,saut=0):
    """1re colonne d'encre apres 'saut' colonnes vides, puis le RUN de colonnes contigues -> hauteur d'encre"""
    x0,y0,x1,y1=box
    cols=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1) if sum(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil)
        cols.append((x,n))
    nz=[x for x,n in cols if n>0]
    if not nz:
        print("  %-26s : 0 colonne d'encre  [sonde muette]"%lab); return None
    xa=nz[0]; xb=xa
    d=dict(cols)
    while xb+1<x1 and d.get(xb+1,0)>0: xb+=1
    rows=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(xa,xb+1) if sum(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil)
        rows.append((y,n))
    nzr=[y for y,n in rows if n>0]
    h=nzr[-1]-nzr[0]+1
    print("  %-26s : 1re lettre x=%d..%d  encre y=%d..%d  HAUTEUR=%d px = %.2f CSS"%(lab,xa,xb,nzr[0],nzr[-1],h,h/3.6))
    return h

R=Image.open("reference-1080x2102.png").convert('RGB'); pr=R.load()
C=Image.open("capture-1080x2400.png").convert('RGB'); pc=C.load()
print("OUVERT ref %s / cap %s"%(R.size,C.size))
print("=== REFERENCE ===")
f=fond_de(pr,(700,455,1000,480))
lettre(pr,(46,455,120,510),f,60,"h3 'C' de Ce batiment")
lettre(pr,(46,520,120,560),f,45,"p  'C' de Ce qu'il rapporte")
f2=fond_de(pr,(700,760,900,780))
lettre(pr,(105,640,180,690),f2,60,"fiche h4 'I' d'Imprimerie")
lettre(pr,(105,765,190,805),f2,45,"fiche .l u 'C' (CE QU'IL)")
lettre(pr,(770,765,860,805),f2,45,"fiche .l b 'p' presque->1re")
f3=fond_de(pr,(700,1795,900,1808))
lettre(pr,(46,1806,120,1855),f3,60,"dm-dit 'L' de Lt.")
f4=fond_de(pr,(600,1970,900,2010))
lettre(pr,(90,1965,160,2015),f4,60,"geste 'L' de LE RASER")
print("  [controle negatif]")
lettre(pr,(300,1400,700,1450),fond_de(pr,(300,1400,700,1450)),60,"bande vide sous la fiche")
print()
print("=== CAPTURE ===")
g=fond_de(pc,(700,250,1000,285))
lettre(pc,(44,275,120,325),g,60,"h3 'L' de L'organisation")
lettre(pc,(44,340,120,375),g,45,"p  'P' de Plus vous tenez")
g2=fond_de(pc,(900,470,1020,530))
lettre(pc,(100,465,230,545),g2,60,"glob .gros '1' de 13")
lettre(pc,(232,470,300,510),g2,60,"glob .q b 'C' de Ca tient")
lettre(pc,(232,515,300,548),g2,45,"glob .q i '1' de 13 endroits")
g3=fond_de(pc,(650,760,850,830))
lettre(pc,(75,745,150,790),g3,60,"rangee titre 'C' de Colis")
lettre(pc,(75,795,150,830),g3,45,"rangee sous 'U' de Un point")
lettre(pc,(930,770,1010,805),g3,45,"rangee statut 'l' de libre")
g4=fond_de(pc,(700,1900,900,1930))
lettre(pc,(44,1848,120,1900),g4,60,"dm-dit 'D' de Dima")
g5=fond_de(pc,(600,1990,900,2030))
lettre(pc,(85,1980,160,2025),g5,60,"geste 'V' de VOIR")
lettre(pc,(810,1985,900,2020),g5,45,"geste small 'l' de le plus")
g6=fond_de(pc,(700,640,900,700))
lettre(pc,(44,645,120,690),g6,45,"dm-titron 'V' de VOS 17 SITES")
print("  [controle negatif]")
lettre(pc,(300,690,700,720),fond_de(pc,(300,690,700,720)),60,"bande vide entre titron et rangee")
