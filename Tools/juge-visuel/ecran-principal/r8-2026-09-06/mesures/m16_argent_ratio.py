# -*- coding: utf-8 -*-
"""m16 - (a) volute droite : re-verification en excluant l'encre du texte ;
(b) jour REEL entre le montant et le medaillon, sur la ligne de l'encre ;
(c) barre de ratio : remplissage ET piste."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json'))

print("=== m16 ===")
print("\n(a) VOLUTE DROITE : fenetre x 355..392, y 20..33, encre du texte exclue (creme et braise)")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); px=im.load()
    hits=[]
    for yy in range(int(20*f),int(33*f)):
        for xx in range(int(355*f),int(392*f)):
            c=px[xx,yy]
            if dist_max(c,JETONS['creme'])<=70: continue
            if dist_max(c,JETONS['braise'])<=70: continue
            vois=[L(px[xx,yy+k]) for k in (-6,-5,5,6)]
            if L(c)-mediane(vois)>=5.0: hits.append((xx/f,yy/f,c))
    if hits:
        xs=[p[0] for p in hits]; ys=[p[1] for p in hits]
        print("   %-6s : %d px  x %.2f..%.2f  y %.2f..%.2f  encre mediane %s"
              %(cle,len(hits),min(xs),max(xs),min(ys),max(ys),tuple(int(mediane([p[2][k] for p in hits])) for k in range(3))))
    else:
        print("   %-6s : 0 px -> ABSENTE"%cle)

print("\n(b) JOUR entre le montant (or-vif) et le medaillon, mesure sur la LIGNE de l'encre")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle,taire=True); px=im.load(); a=ANC[cle]
    # ligne y ou l'encre or-vif est la plus a droite
    best=None
    for yy in range(int(18*f),int(44*f)):
        xr=None
        for xx in range(int(int(a['cx'])*f),int(10*f),-1):
            c=px[xx,yy]
            if dist_max(c,JETONS['or-vif'])<=45 and c[0]>150: xr=xx/f; break
        if xr and (best is None or xr>best[1]): best=(yy/f,xr)
    if not best: print("   %s : pas d'encre"%cle); continue
    yl,xr=best
    # a partir de xr, ou le signal du cerclage (R-B) depasse-t-il le fond de 12 ?
    yi=int(yl*f)
    fond=mediane([px[xx,yi][0]-px[xx,yi][2] for xx in range(int((xr+2)*f),int((xr+8)*f))])
    xg=None
    for xx in range(int((xr+0.3)*f), int((a['cx'])*f)):
        if (px[xx,yi][0]-px[xx,yi][2])-fond>=12: xg=xx/f; break
    print("   %-6s : y=%.2f ; dernier px or-vif x=%.2f ; premiere lueur du cerclage x=%s => jour VISIBLE %s CSS"
          %(cle,yl,xr,("%.2f"%xg) if xg else "aucune",("%.2f"%(xg-xr)) if xg else "n/a"))

print("\n(c) BARRE DE RATIO (canon : .ratio 74x2 CSS, piste #5a6376, remplissage --or a 68 %%)")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle,taire=True); px=im.load()
    # ligne la plus 'or' entre y 38 et 50, dans x 10..180
    best=None
    for yy in range(int(37*f),int(50*f)):
        n=sum(1 for xx in range(int(10*f),int(180*f)) if dist_max(px[xx,yy],JETONS['or'])<=60)
        if best is None or n>best[1]: best=(yy,n)
    yi,n=best
    xs=[xx/f for xx in range(int(10*f),int(180*f)) if dist_max(px[xx,yi],JETONS['or'])<=60]
    print("   %-6s : ligne y=%.2f ; encre OR de x %.2f a %.2f (%.2f CSS)"%(cle,yi/f,min(xs),max(xs),max(xs)-min(xs)))
    # piste : couleurs a droite du remplissage sur la meme ligne
    seq=[]
    for xc in [max(xs)+2, max(xs)+6, max(xs)+12, max(xs)+20]:
        if xc*f < im.size[0]: seq.append("%.0f:%s"%(xc, px[int(xc*f),yi]))
    print("      a droite du remplissage : %s"%("  ".join(seq)))
    # epaisseur
    xm=int(((min(xs)+max(xs))/2)*f)
    col=[(j/f, dist_max(px[xm,j],JETONS['or'])) for j in range(int(36*f),int(52*f))]
    on=[y for y,d in col if d<=60]
    print("      epaisseur a mi-longueur : %.2f CSS (y %.2f..%.2f)"%(max(on)-min(on)+1/f,min(on),max(on)))
