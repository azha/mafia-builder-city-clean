# -*- coding: utf-8 -*-
"""m17 - correction de m16 : (b) le jour se mesure a partir du bord DROIT du montant, en
balayant vers la DROITE (m16 balayait vers la gauche et tombait sur le pivot du cadran) ;
(c) la barre de ratio se cherche dans y 38..48 avec un seuil serre (le filet, en --laiton,
est a 41/255 de --or et polluait la mesure)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json'))
print("=== m17 ===")
print("\n(b) JOUR montant <-> medaillon")
for cle,xmax in [('canon',120.0),('j1920',180.0),('j2400',180.0)]:
    im,f=ouvrir(cle); px=im.load(); a=ANC[cle]
    best=None
    for yy in range(int(18*f),int(44*f)):
        for xx in range(int(xmax*f),int(10*f),-1):
            c=px[xx,yy]
            if dist_max(c,JETONS['or-vif'])<=45 and c[0]>150:
                if best is None or xx/f>best[1]: best=(yy/f,xx/f)
                break
    yl,xr=best; yi=int(yl*f)
    fond=mediane([px[xx,yi][0]-px[xx,yi][2] for xx in range(int((xr+1.5)*f),int((xr+5)*f))])
    xg=None
    for xx in range(int((xr+0.4)*f), int(a['cx']*f)):
        if (px[xx,yi][0]-px[xx,yi][2])-fond>=12: xg=xx/f; break
    bn=a['cx']-a['r_nom_ext']
    print("   %-6s : ligne y=%.2f ; montant finit x=%.2f ; bord NOMINAL du cerclage x=%.2f (jour %+.2f CSS) ;"
          " premiere LUEUR x=%s (jour VISIBLE %s CSS)"
          %(cle,yl,xr,bn,bn-xr,("%.2f"%xg) if xg else "-", ("%.2f"%(xg-xr)) if xg else "-"))
print("\n(c) BARRE DE RATIO (seuil serre : dist a --or <=30, y 38..48)")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle,taire=True); px=im.load()
    best=None
    for yy in range(int(38*f),int(48*f)):
        n=sum(1 for xx in range(int(10*f),int(190*f)) if dist_max(px[xx,yy],JETONS['or'])<=30)
        if best is None or n>best[1]: best=(yy,n)
    yi,n=best
    xs=[xx/f for xx in range(int(10*f),int(190*f)) if dist_max(px[xx,yi],JETONS['or'])<=30]
    if not xs: print("   %s : aucune encre --or"%cle); continue
    xm=int(((min(xs)+max(xs))/2)*f)
    on=[j/f for j in range(int(36*f),int(50*f)) if dist_max(px[xm,j],JETONS['or'])<=30]
    print("   %-6s : y=%.2f ; remplissage --or  x %.2f..%.2f = %.2f CSS ; epaisseur %.2f CSS"
          %(cle,yi/f,min(xs),max(xs),max(xs)-min(xs),max(on)-min(on)+1/f))
    prof=[]
    for xc in range(int(min(xs)), int(min(xs))+95, 8):
        prof.append("%d:%s"%(xc,px[int(xc*f),yi]))
    print("      couleurs le long de la barre : %s"%("  ".join(prof)))
    print("      couleur 6 CSS a droite de la fin : %s   (piste attendue du canon : #5a6376 = (90,99,118))"%(px[int((max(xs)+6)*f),yi],))
