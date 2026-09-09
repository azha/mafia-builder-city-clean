# -*- coding: utf-8 -*-
"""m35 - filet superieur de la fiche, x borne a 20..350 CSS : la reference porte, au coin
haut-droit de la plaque, une PASTILLE D'ANNOTATION `.co` numero 5 (fond --or) qui polluait la
mesure precedente. + presence du losange sous le medaillon."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
TOP={'canon':424.52,'j1920':425.39,'j2400':599.61}
print("=== m35 ===\n-- filet superieur de la fiche (x borne 20..350)")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); px=im.load(); t=TOP[cle]
    best=None
    for yy in range(int((t-1.5)*f),int((t+4)*f)):
        xs=[xx/f for xx in range(int(20*f),int(350*f)) if (px[xx,yy][0]-px[xx,yy][2])>=40 and px[xx,yy][0]>=95]
        if best is None or len(xs)>best[1]: best=(yy/f,len(xs),xs)
    y,n,xs=best
    med=tuple(int(mediane([px[int(x*f),int(y*f)][k] for x in xs])) for k in range(3))
    pic=[x for x in xs if dist_max(px[int(x*f),int(y*f)],JETONS['laiton'])<=25]
    print("   %-6s : y=%.2f ; encre x %.2f..%.2f (%.2f CSS) ; plein laiton x %.2f..%.2f ; couleur %s (dist --laiton %d)"
          %(cle,y,min(xs),max(xs),max(xs)-min(xs),(min(pic) if pic else -1),(max(pic) if pic else -1),med,dist_max(med,JETONS['laiton'])))
print("\n-- LOSANGE sous le medaillon (canon : 7x7 CSS tourne 45 deg, --laiton, bottom:-11px)")
import json
ANC=json.load(open('ancres.json'))
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle,taire=True); px=im.load(); a=ANC[cle]
    P=[(xx/f,yy/f) for yy in range(int(70*f),int(92*f)) for xx in range(int((a['cx']-12)*f),int((a['cx']+12)*f))
       if dist_max(px[xx,yy],JETONS['laiton'])<=45]
    if P:
        xs=[p[0] for p in P]; ys=[p[1] for p in P]
        print("   %-6s : %d px ; boite %.2f x %.2f CSS a (%.2f ; %.2f) ; centre x %.2f (centre boitier %.2f)"
              %(cle,len(P),max(xs)-min(xs),max(ys)-min(ys),min(xs),min(ys),(min(xs)+max(xs))/2,a['cx']))
    else: print("   %-6s : ABSENT"%cle)
