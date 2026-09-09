# -*- coding: utf-8 -*-
"""m05 - geometrie du cadran : PIVOT, masques d'arcs nettoyes par COMPOSANTES CONNEXES.
Le pivot (disque laiton, `circle r=2.6` du canon) sert d'origine a la 2e convention d'angle.
CONTROLE POSITIF : sur le canon, la plus grosse composante braise doit contenir >300 px et
avoir une etendue radiale < 4 CSS (une bande, pas un glyphe)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
from PIL import Image

ANC=json.load(open('ancres.json'))
def est_teal(c):
    r,g,b=c
    return (b-r)>=14 and (g-r)>=10 and g>=55
def est_braise(c):
    r,g,b=c
    return (r-b)>=26 and (r-g)>=16 and r>=85
def est_laiton(c):
    r,g,b=c
    return (r-b)>=60 and 120<=r<=215 and 100<=g<=185 and (r-g)>=20

def composantes(cle, fn, rmin, rmax):
    im,f=ouvrir(cle,taire=True); px=im.load(); W,H=im.size
    a=ANC[cle]; cx,cy=a['cx'],a['cy']
    S=set()
    for yy in range(max(0,int((cy-rmax)*f)), min(H,int((cy+rmax)*f)+1)):
        for xx in range(max(0,int((cx-rmax)*f)), min(W,int((cx+rmax)*f)+1)):
            d=math.hypot(xx/f-cx, yy/f-cy)
            if rmin<=d<=rmax and fn(px[xx,yy]): S.add((xx,yy))
    comps=[]; vus=set()
    for s in S:
        if s in vus: continue
        pile=[s]; vus.add(s); comp=[]
        while pile:
            p=pile.pop(); comp.append(p)
            for dx in (-1,0,1):
                for dy in (-1,0,1):
                    q=(p[0]+dx,p[1]+dy)
                    if q in S and q not in vus: vus.add(q); pile.append(q)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    return comps,(cx,cy),f

def pivot(cle):
    """Centroide des pixels laiton du disque central (r<6 CSS du centre du boitier, 6 CSS sous)."""
    im,f=ouvrir(cle,taire=True); px=im.load()
    a=ANC[cle]; cx,cy=a['cx'],a['cy']
    P=[]
    for yy in range(int((cy-3)*f), int((cy+11)*f)):
        for xx in range(int((cx-7)*f), int((cx+7)*f)):
            if est_laiton(px[xx,yy]): P.append((xx/f,yy/f))
    if not P: return None
    return sum(p[0] for p in P)/len(P), sum(p[1] for p in P)/len(P), len(P)

print("=== m05 : pivot + composantes des arcs ===")
sortie={}
for cle in ['canon','j1920','j2400']:
    ouvrir(cle)
    a=ANC[cle]
    pv=pivot(cle)
    print("\n-- %s : centre boitier (%.2f ; %.2f)  PIVOT centroide (%.2f ; %.2f) [%d px] => %+.2f CSS sous le centre"
          %(cle,a['cx'],a['cy'],pv[0],pv[1],pv[2],pv[1]-a['cy']))
    d={}
    for quoi,fn in [('teal',est_teal),('braise',est_braise)]:
        comps,(cx,cy),f=composantes(cle,fn,7.0,26.0)
        print("   %s : %d composantes, tailles %s"%(quoi,len(comps),[len(c) for c in comps[:6]]))
        c=comps[0]
        rs=[math.hypot(p[0]/f-cx,p[1]/f-cy) for p in c]
        print("      + la plus grosse : %d px, rayon %.2f..%.2f (etendue %.2f CSS), median %.2f"
              %(len(c),min(rs),max(rs),max(rs)-min(rs),mediane(rs)))
        d[quoi]=[[p[0]/f,p[1]/f] for p in c]
    sortie[cle]=dict(pvx=pv[0],pvy=pv[1],**{k:v for k,v in d.items()})
json.dump(sortie,open('cadran.json','w'))
print("\n[ecrit] cadran.json")
