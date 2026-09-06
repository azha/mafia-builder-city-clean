# -*- coding: utf-8 -*-
"""m01 - ancres : centre et diametre NOMINAL du boitier du medaillon.
Discriminant : R-B. Convention de bord DECLAREE :
  NOMINAL = mi-alpha (mi-hauteur entre le fond local et le pic local)
  CoEUR   = pixels > 95 % du pic local.
On travaille par RUNS contigus pour ne pas confondre cerclage / filet (y=51) / losange (y=75)."""
import sys; sys.path.insert(0,'.')
from commun import *

def runs(vals, seuil):
    r=[]; deb=None
    for i,v in enumerate(vals):
        if v>=seuil and deb is None: deb=i
        elif v<seuil and deb is not None: r.append((deb,i-1)); deb=None
    if deb is not None: r.append((deb,len(vals)-1))
    return r

def coupe(cle, axe, fixe, a, b):
    """axe='h' : ligne y=fixe, x de a a b ; axe='v' : colonne x=fixe, y de a a b. CSS."""
    im,f = ouvrir(cle, taire=True); px=im.load()
    out=[]
    k=int(round(fixe*f))
    for i in range(int(round(a*f)), int(round(b*f))):
        c = px[i,k] if axe=='h' else px[k,i]
        out.append((i/f, c[0]-c[2], c))
    return out

def bords(prof, exclure=None):
    """Renvoie (bord_gauche_nominal, bord_droit_nominal, pic, fond) du run le plus large."""
    vals=[p[1] for p in prof]
    pic=max(vals); fond=mediane(sorted(vals)[:max(4,len(vals)//5)])
    mi=fond+(pic-fond)*0.5
    rr=runs(vals, mi)
    if exclure: rr=[r for r in rr if not exclure(prof[r[0]][0], prof[r[1]][0])]
    if not rr: return None
    return rr, pic, fond, mi

print("=== m01 : ancres du medaillon (runs contigus) ===")
ANC={}
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle)
    print("\n-- %s"%cle)
    # ligne horizontale : on cherche le y (hors filet) ou l'ecart entre les DEUX runs du cerclage est max
    meilleur=None
    for i in range(int(5*f), int(84*f)):
        ycss=i/f
        if 49.0 <= ycss <= 53.5: continue          # filet du bandeau
        p=coupe(cle,'h',ycss,150,246)
        b=bords(p)
        if b is None: continue
        rr,pic,fond,mi=b
        if pic<40: continue
        if len(rr)<2: continue
        g=p[rr[0][0]][0]; d=p[rr[-1][1]][0]
        if meilleur is None or (d-g)>meilleur[3]:
            meilleur=(ycss,g,d,d-g,pic,len(rr))
    ycss,g,d,larg,pic,nrun=meilleur
    cx=(g+d)/2.0
    print("   diametre horizontal max : y=%.2f  x %.2f..%.2f  D=%.2f CSS  pic=%d  runs=%d"%(ycss,g,d,larg,pic,nrun))
    # colonne verticale a cx
    p=coupe(cle,'v',cx,0,95)
    b=bords(p, exclure=lambda a,z: (a<53.5 and z>49.0 and (z-a)<3.0) )
    rr,pic,fond,mi=b
    segs=[(p[r[0]][0],p[r[1]][0]) for r in rr]
    print("   colonne x=%.2f : runs = %s"%(cx, " ".join("%.2f..%.2f"%s for s in segs)))
    # le boitier = premier run (haut) et le run juste avant le losange
    hauts=[s for s in segs if s[0]<20]
    bas=[s for s in segs if 60<s[1]<75]
    yh=hauts[0][0] if hauts else None
    yb=max([s[1] for s in segs if s[1]<74]) if segs else None
    print("   => bord haut %.2f  bord bas %.2f  D vertical=%.2f  centre y=%.2f"%(yh,yb,yb-yh,(yh+yb)/2.0))
    ANC[cle]=(cx,(yh+yb)/2.0, larg/2.0)
    print("   ANCRE %s : centre (%.2f ; %.2f) CSS  rayon nominal ext %.2f CSS"%(cle,cx,(yh+yb)/2.0,larg/2.0))
import json
json.dump({k:list(v) for k,v in ANC.items()}, open('ancres.json','w'), indent=1)
print("\n[ecrit] ancres.json")
