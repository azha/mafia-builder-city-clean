#!/usr/bin/env python3
"""m16 - les 4 tuiles : bornes verticales, hauteur, ecart, et les 2 lignes de
texte de chacune. Coordonnees LOCALES du cadre.
Bord de tuile detecte par le liseré clair (lum > fond_tuile + 3) sur >=200 px.
Controle positif : les 4 tuiles doivent avoir la meme hauteur a +-2 px de chaque
cote ; controle negatif : la fenetre 1000..1160 (sous la pile) ne doit rendre
aucune tuile.
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAD={'ref':('reference-1080x2102.png',21,452),'jeu':('capture-1080x2400.png',18,482)}
XA,XB=505,1000
for nom in ('ref','jeu'):
    f,X0,Y0=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    # liserés horizontaux
    rows=[]
    for y in range(400,1160):
        n=sum(1 for x in range(XA,XB,2) if lum(px[X0+x,Y0+y])-max(lum(px[X0+x,Y0+y-4]),lum(px[X0+x,Y0+y+4]))>3)
        if n>=150: rows.append(y)
    b=[]; d=rows[0]; p=rows[0]
    for y in rows[1:]:
        if y-p>3: b.append((d,p)); d=y
        p=y
    b.append((d,p))
    print('  liserés horizontaux (local) :', b)
    tu=[(b[i][0],b[i+1][1]) for i in range(0,len(b)-1,2)]
    print('  tuiles :', [(a,c,c-a+1) for a,c in tu])
    if len(tu)>=4:
        print('  hauteurs :', [c-a+1 for a,c in tu[:4]])
        print('  ecarts haut-a-haut :', [tu[i+1][0]-tu[i][0] for i in range(3)])
        print('  gouttieres entre tuiles :', [tu[i+1][0]-tu[i][1]-1 for i in range(3)])
    # lignes de texte de la tuile 1
    a,c=tu[0]
    fondt=statistics.median([lum(px[X0+x,Y0+y]) for y in range(a+6,c-5) for x in range(XA+80,XB-10,3)])
    tr=[]
    for y in range(a+3,c-2):
        n=sum(1 for x in range(XA+80,XB-10) if abs(lum(px[X0+x,Y0+y])-fondt)>14)
        if n>=4: tr.append(y)
    bb=[]; d=tr[0]; p=tr[0]
    for y in tr[1:]:
        if y-p>2: bb.append((d,p)); d=y
        p=y
    bb.append((d,p))
    print(f'  tuile 1 : fond {fondt:.1f}, lignes de texte {bb}')
    print(f'    padding haut {bb[0][0]-a}, interligne {bb[1][0]-bb[0][0] if len(bb)>1 else "?"}, padding bas {c-bb[-1][1]}')
