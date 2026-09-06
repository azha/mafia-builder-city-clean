# -*- coding: utf-8 -*-
"""m26 - nom du district : forme du fond pose sous le nom, contraste de l'encre, PIRE CAS.
Le contraste se mesure sur le fond REEL, glyphe par glyphe : pour chaque colonne d'encre, le fond
est la mediane des pixels non-encre dans une fenetre de +-4 CSS autour du glyphe -> on garde le
PIRE. Encre attendue : --creme (234,224,200) ou --creme-2.
Le fond pose se mesure par sa MARCHE de luminance par rapport a l'art immediatement au-dessus et
au-dessous, sur toute la largeur (c'est sa FORME qu'on decrit, et elle va en ARBITRAGE)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
print("=== m26 : nom du district ===")
for cle in ['j1920','j2400','d2400']:
    im,f=ouvrir(cle); px=im.load()
    # bande d'encre claire dans y 78..104, x 4..120
    prof=[]
    for yy in range(int(76*f),int(106*f)):
        n=sum(1 for xx in range(int(4*f),int(140*f)) if dist_max(px[xx,yy],JETONS['creme'])<=70 and min(px[xx,yy])>120)
        prof.append((yy/f,n/f))
    pic=max(n for _,n in prof)
    band=[y for y,n in prof if n>=pic*0.2]
    y0,y1=band[0],band[-1]
    enc=[];xs=[]
    for yy in range(int(y0*f),int((y1+1)*f)):
        for xx in range(int(4*f),int(140*f)):
            c=px[xx,yy]
            if dist_max(c,JETONS['creme'])<=70 and min(c)>120: enc.append((xx/f,yy/f,c)); xs.append(xx/f)
    ce=tuple(int(mediane([e[2][k] for e in enc])) for k in range(3))
    print("\n-- %s : encre du nom  y %.2f..%.2f (capitale ~%.2f CSS)  x %.2f..%.2f  couleur %s (dist --creme %d)"
          %(cle,y0,y1,y1-y0,min(xs),max(xs),ce,dist_max(ce,JETONS['creme'])))
    # contraste : par colonne d'encre, fond = mediane des non-encre a +-5 CSS
    cts=[]
    for xc in sorted(set(round(e[0]*2)/2 for e in enc)):
        fond=[]
        for yy in range(int((y0-5)*f),int((y1+6)*f)):
            for xx in range(int((xc-2)*f),int((xc+2)*f)):
                c=px[xx,yy]
                if not (dist_max(c,JETONS['creme'])<=90 and min(c)>100): fond.append(c)
        if len(fond)<40: continue
        cf=tuple(int(mediane([c[k] for c in fond])) for k in range(3))
        cts.append((contraste(ce,cf), xc, cf))
    cts.sort()
    print("   contraste sur le fond REEL, par colonne d'encre : PIRE %.2f:1 (x=%.1f, fond %s) | median %.2f:1 | meilleur %.2f:1"
          %(cts[0][0],cts[0][1],cts[0][2],mediane([c[0] for c in cts]),cts[-1][0]))
    # FORME du fond pose : marche de L par rapport a l'art au-dessus / en-dessous, sur 8 colonnes
    print("   forme du fond pose (L par colonne, y=%.1f au-dessus / dans la bande / %.1f en-dessous) :"%(y0-9,y1+9))
    seq=[]
    for xc in range(10,392,42):
        xi=min(im.size[0]-1,int(xc*f))
        a=mediane([L(px[xi,int(yy*f)]) for yy in [y0-11,y0-10,y0-9]])
        b=mediane([L(px[xi,int(yy*f)]) for yy in [y0-2,y0-1,(y0+y1)/2,y1+1,y1+2]])
        c2=mediane([L(px[xi,int(yy*f)]) for yy in [y1+9,y1+10,y1+11]])
        seq.append("x%3d:%.0f/%.0f/%.0f"%(xc,a,b,c2))
    print("      "+"  ".join(seq))
    # bornes verticales du fond pose : profil de L a x=340 (loin du texte)
    xi=int(340*f)
    pr=[(j/f,L(px[xi,j])) for j in range(int(70*f),int(115*f))]
    print("   profil L a x=340 (y:L) : %s"%(" ".join("%.1f:%.0f"%(y,v) for y,v in pr)))
