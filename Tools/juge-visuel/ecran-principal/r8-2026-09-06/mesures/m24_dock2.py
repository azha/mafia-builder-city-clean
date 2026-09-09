# -*- coding: utf-8 -*-
"""m24 - dock : libelles (bande d'encre, capitale, CONTRASTE sur le fond REEL sous chaque glyphe),
ronds, indicateur d'onglet actif, et la MARCHE de luminance au bord haut du dock.
Encre attendue : --creme-2 (185,173,146). Contraste = WCAG entre l'encre MEDIANE des glyphes et
le fond MEDIAN des pixels non-encre de la meme boite (art reel, jamais un gris choisi)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
CENTRES=[93.67,161.67,229.67,297.67]
HAUT={'canon':696.88,'j1920':696.88,'j2400':871.06,'t2400':871.06}
print("=== m24 : dock ===")
for cle in ['canon','j1920','j2400','t2400']:
    im,f=ouvrir(cle); px=im.load(); W,H=im.size
    hcss=HAUT[cle]
    # bande d'encre des libelles : chercher dans les 45 CSS du bas
    prof=[]
    for yy in range(int((hcss-45)*f), min(H,int(hcss*f))):
        n=sum(1 for xx in range(int(60*f),int(340*f)) if dist_max(px[xx,yy],JETONS['creme-2'])<=60)
        prof.append((yy/f,n))
    pic=max(n for _,n in prof)
    band=[y for y,n in prof if n>=pic*0.15]
    y0,y1=band[0],band[-1]
    print("\n-- %s : bande des libelles y %.2f..%.2f (h %.2f) ; bas d'ecran %.2f"%(cle,y0,y1,y1-y0,hcss))
    tot=[]
    for k,cx in enumerate(CENTRES):
        enc=[];fond=[]
        for yy in range(int((y0-1)*f),int((y1+2)*f)):
            for xx in range(int((cx-30)*f),int((cx+30)*f)):
                c=px[xx,yy]
                (enc if dist_max(c,JETONS['creme-2'])<=55 else fond).append(c)
        if not enc: print("     rond %d : pas d'encre"%k); continue
        ce=tuple(int(mediane([c[i] for c in enc])) for i in range(3))
        cf=tuple(int(mediane([c[i] for c in fond])) for i in range(3))
        ct=contraste(ce,cf)
        tot.append(ct)
        print("     libelle %d (x~%.0f) : encre %s (%d px) | fond median %s (%d px) | CONTRASTE %.2f:1 | L fond %.1f"
              %(k+1,cx,ce,len(enc),cf,len(fond),ct,L(cf)))
    if tot: print("     => pire cas %.2f:1 ; median %.2f:1  (doctrine : petit texte >= 4.5:1)"%(min(tot),mediane(tot)))
    # MARCHE au bord haut du dock : profil de L sur une colonne libre (x=22 CSS), 60 CSS au-dessus du bas
    xi=int(22*f)
    pr=[(j/f,L(px[xi,j])) for j in range(int((hcss-115)*f), min(H,int(hcss*f)))]
    print("     profil L a x=22 : %s"%(" ".join("%.0f:%.0f"%(y,v) for y,v in pr[::int(2*f)])))
    # dock du canon : 605.70..695.87 ; rampe transparent->#070b12d8 sur 40 % = 36.07 CSS
