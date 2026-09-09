# -*- coding: utf-8 -*-
"""m02 - centre du boitier par AJUSTEMENT RADIAL.
Pour un centre candidat, on calcule le profil radial MEDIAN de (R-B) sur 360 rayons.
Le bon centre est celui qui maximise le pic du profil median (un centre faux etale l'anneau).
Controle positif : sur le canon, le centre trouve doit tomber a <1 CSS de (196 ; 39) = `.medaillon`
64x64 a (164;8) lu au navigateur (mesure-canon.txt)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *

def profil_radial(im, f, cx, cy, rmax=40.0, pas=0.10, nray=360, canal='rb'):
    px=im.load(); W,H=im.size
    nr=int(rmax/pas)
    prof=[]
    for i in range(nr):
        r=i*pas
        vals=[]
        for k in range(nray):
            a=2*math.pi*k/nray
            x=int(round((cx+r*math.cos(a))*f)); y=int(round((cy-r*math.sin(a))*f))
            if 0<=x<W and 0<=y<H:
                c=px[x,y]
                vals.append(c[0]-c[2] if canal=='rb' else L(c))
        prof.append((r, mediane(vals)))
    return prof

res={}
for cle,(cx0,cy0) in [('canon',(195.9,38.9)),('j1920',(195.9,39.8)),('j2400',(195.9,39.8))]:
    im,f=ouvrir(cle)
    best=None
    for dy in [k*0.15 for k in range(-14,15)]:
        for dx in [k*0.15 for k in range(-14,15)]:
            cx,cy=cx0+dx,cy0+dy
            p=profil_radial(im,f,cx,cy,rmax=40,pas=0.25,nray=180)
            pic=max(v for r,v in p if r>20)
            if best is None or pic>best[0]: best=(pic,cx,cy)
    pic,cx,cy=best
    p=profil_radial(im,f,cx,cy,rmax=42,pas=0.05,nray=720)
    fond=mediane([v for r,v in p if 20<r<26])
    top=max(v for r,v in p if r>26)
    mi=fond+(top-fond)*0.5
    au=[r for r,v in p if r>24 and v>=mi]
    coeur=[r for r,v in p if r>24 and v>=fond+(top-fond)*0.95]
    print("\n== %s : centre ajuste (%.2f ; %.2f) CSS ; pic median R-B = %d"%(cle,cx,cy,top))
    print("   fond intra-disque (R-B, r 20..26) = %.1f ; mi-alpha = %.1f"%(fond,mi))
    print("   CERCLAGE  NOMINAL (mi-alpha) : r %.3f .. %.3f  => epaisseur %.3f CSS ; D ext nominal %.2f"
          %(au[0],au[-1],au[-1]-au[0], 2*au[-1]))
    print("   CERCLAGE  CoEUR (>95%% du pic) : r %.3f .. %.3f => epaisseur %.3f CSS (%.0f%% de plat)"
          %(coeur[0],coeur[-1],coeur[-1]-coeur[0], 100.0*(coeur[-1]-coeur[0])/(au[-1]-au[0])))
    res[cle]=dict(cx=cx,cy=cy,r_nom_int=au[0],r_nom_ext=au[-1],pic=top,fond=fond)
    # profil imprime autour du cerclage
    print("   profil (r : R-B median) :")
    ligne=[]
    for r,v in p:
        if 25.0<=r<=40.0 and abs(r*20-round(r*20))<1e-6 and abs((r*4)-round(r*4))<1e-9:
            ligne.append("%.2f:%d"%(r,v))
    print("     "+"  ".join(ligne))
json.dump(res, open('ancres.json','w'), indent=1)
print("\n[ecrit] ancres.json")
