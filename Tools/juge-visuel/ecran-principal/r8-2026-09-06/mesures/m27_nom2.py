# -*- coding: utf-8 -*-
"""m27 - nom du district, mesure serree : fenetre x 3..42 CSS (le nom seul ; a 1080x1920 les
NUAGES de l'art atteignent L 60+ vers x 100-140 et polluaient la mesure de m26).
Contraste : encre = mediane du CoEUR des glyphes ; fond = mediane des pixels non-encre dans la
bande du texte, colonne par colonne -> on garde le PIRE."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
print("=== m27 : nom du district (fenetre serree) ===")
for cle in ['j1920','j2400']:
    im,f=ouvrir(cle); px=im.load()
    X0,X1=3.0,42.0
    prof=[]
    for yy in range(int(78*f),int(100*f)):
        n=sum(1 for xx in range(int(X0*f),int(X1*f)) if min(px[xx,yy])>120)
        prof.append((yy/f,n/f))
    pic=max(n for _,n in prof)
    band=[y for y,n in prof if n>=pic*0.18]
    y0,y1=band[0],band[-1]
    enc=[(xx/f,yy/f,px[xx,yy]) for yy in range(int(y0*f),int((y1+1)*f))
                               for xx in range(int(X0*f),int(X1*f)) if min(px[xx,yy])>135]
    ce=tuple(int(mediane([e[2][k] for e in enc])) for k in range(3))
    # hauteur de capitale = run vertical max de la colonne la plus 'pleine' du L majuscule
    hs=[]
    for xx in range(int(X0*f),int(X1*f)):
        col=[yy for yy in range(int((y0-3)*f),int((y1+3)*f)) if min(px[xx,yy])>135]
        if col: hs.append((max(col)-min(col)+1)/f)
    from collections import Counter
    cap=Counter(round(h*4)/4.0 for h in hs).most_common(3)
    print("\n-- %s : encre %s (dist --creme %d, --creme-2 %d) ; bande y %.2f..%.2f ; x %.2f..%.2f ; capitale (mode) %s"
          %(cle,ce,dist_max(ce,JETONS['creme']),dist_max(ce,JETONS['creme-2']),y0,y1,
            min(e[0] for e in enc),max(e[0] for e in enc),cap))
    cts=[]
    for xc in [x/2.0 for x in range(int(X0*2),int(X1*2))]:
        f_=[px[xx,yy] for yy in range(int((y0-2)*f),int((y1+3)*f)) for xx in range(int((xc-1)*f),int((xc+1)*f)) if min(px[xx,yy])<=110]
        e_=[px[xx,yy] for yy in range(int(y0*f),int((y1+1)*f)) for xx in range(int((xc-1)*f),int((xc+1)*f)) if min(px[xx,yy])>135]
        if len(f_)<25 or len(e_)<6: continue
        cf=tuple(int(mediane([c[k] for c in f_])) for k in range(3))
        ce2=tuple(int(mediane([c[k] for c in e_])) for k in range(3))
        cts.append((contraste(ce2,cf),xc,cf,ce2))
    cts.sort()
    print("   contraste local, %d colonnes : PIRE %.2f:1 (x=%.1f fond %s encre %s) | median %.2f:1 | meilleur %.2f:1"
          %(len(cts),cts[0][0],cts[0][1],cts[0][2],cts[0][3],mediane([c[0] for c in cts]),cts[-1][0]))
    # contraste global encre / fond de la bande entiere
    fond=[px[xx,yy] for yy in range(int(y0*f),int((y1+1)*f)) for xx in range(int(X0*f),int(X1*f)) if min(px[xx,yy])<=110]
    cf=tuple(int(mediane([c[k] for c in fond])) for k in range(3))
    print("   contraste GLOBAL encre %s / fond de bande %s = %.2f:1   (doctrine : petit texte >= 4.5:1)"%(ce,cf,contraste(ce,cf)))
    # LE FOND POSE : etendue verticale et facteur d'assombrissement
    xs=[340.0,178.0,52.0]
    print("   fond pose -- profil L (x : L au-dessus / dans la bande / au-dessous ; rapport) :")
    for xc in xs:
        xi=int(xc*f)
        a=mediane([L(px[xi,int(yy*f)]) for yy in [80.0,81.0,82.0,83.0]])
        b=mediane([L(px[xi,int(yy*f)]) for yy in [88.0,90.0,92.0,94.0,96.0]])
        c2=mediane([L(px[xi,int(yy*f)]) for yy in [101.0,102.0,103.0]])
        print("      x=%5.1f : %.1f / %.1f / %.1f   rapport bande/dessous = %.3f"%(xc,a,b,c2,b/c2 if c2 else 0))
