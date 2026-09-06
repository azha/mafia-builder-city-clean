#!/usr/bin/env python3
"""m05 - ce que le bandeau RECOUVRE au 1080x1920.
1) bornes du filet or vertical du cadre (colonne x=19) avec un seuil RELACHE
   (le bandeau translucide assombrit l'or sans l'effacer) ;
2) etendue verticale de l'encre DOREE du titre (x 200..900) dans chaque capture ;
3) bas du bandeau = derniere rangee du filet or plein largeur du haut.
Controle positif : au 2400 les memes bornes doivent tomber 480 px plus bas.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLD=(176,141,62)
def dore(p, tol=150):
    r,g,b=p
    return r>g>b and r>70 and abs(r-GOLD[0])+abs(g-GOLD[1])+abs(b-GOLD[2])<=tol
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

for f in ['capture-1080x1920.png','capture-1080x2400.png','reference-1080x2102.png']:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load(); w,H=im.size
    print(f'=== {f} taille={im.size}')
    xr = 19 if 'capture' in f else 22
    ys=[y for y in range(H) if dore(px[xr,y])]
    if ys:
        # bandes contigues
        bandes=[]; deb=ys[0]; prev=ys[0]
        for y in ys[1:]:
            if y-prev>4: bandes.append((deb,prev)); deb=y
            prev=y
        bandes.append((deb,prev))
        bandes=[b for b in bandes if b[1]-b[0]>50]
        print(f'  rail or gauche x={xr} : bandes >50px :', bandes)
    # titre : encre doree claire (luminance>90) dans x 200..900
    rows=[]
    for y in range(H):
        n=sum(1 for x in range(200,900) if dore(px[x,y],tol=200) and lum(px[x,y])>95)
        if n>=8: rows.append(y)
    if rows:
        bandes=[]; deb=rows[0]; prev=rows[0]
        for y in rows[1:]:
            if y-prev>6: bandes.append((deb,prev)); deb=y
            prev=y
        bandes.append((deb,prev))
        print('  bandes d encre doree claire (x200..900) :', bandes[:8])
