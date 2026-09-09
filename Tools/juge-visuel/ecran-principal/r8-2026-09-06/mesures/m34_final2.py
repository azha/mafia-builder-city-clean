# -*- coding: utf-8 -*-
"""m34 - filet superieur de la fiche ; palette globale du CHROME+FICHE ; comparatif du cadran."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
from PIL import Image
ANC=json.load(open('ancres.json'))
TOP={'canon':424.52,'j1920':425.39,'j2400':599.61}
print("=== m34 ===\n-- filet superieur de la fiche (canon : `.fiche::after` inset 14 CSS, gradient laiton 30..70 %%)")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); px=im.load(); t=TOP[cle]
    best=None
    for yy in range(int((t-1)*f),int((t+4)*f)):
        xs=[xx/f for xx in range(int(5*f),int(388*f)) if (px[xx,yy][0]-px[xx,yy][2])>=40 and px[xx,yy][0]>=95]
        if best is None or len(xs)>best[1]: best=(yy/f,len(xs),xs)
    y,n,xs=best
    med=tuple(int(mediane([px[int(x*f),int(y*f)][k] for x in xs])) for k in range(3))
    print("   %-6s : y=%.2f ; encre x %.2f..%.2f (%.2f CSS) ; couleur %s (dist --laiton %d)"
          %(cle,y,min(xs),max(xs),max(xs)-min(xs),med,dist_max(med,JETONS['laiton'])))
print("\n-- PALETTE du CHROME + FICHE (bandeau 0..51 + plaque), 6 couleurs dominantes")
for cle,zones in [('canon',[(0,0,392,51),(13,424.5,379,594)]),
                  ('j1920',[(0,0,392,51),(12,425.4,379,595)]),
                  ('j2400',[(0,0,392,51),(12,599.6,379,769)])]:
    im,f=ouvrir(cle,taire=True); px=im.load()
    from collections import Counter
    c=Counter()
    for (x0,y0,x1,y1) in zones:
        for yy in range(int(y0*f),int(y1*f)):
            for xx in range(int(x0*f),int(x1*f)):
                p=px[xx,yy]; c[(p[0]//16*16,p[1]//16*16,p[2]//16*16)]+=1
    tot=sum(c.values())
    print("   %-6s : %s"%(cle,"  ".join("%s %.1f%%"%(k,100.0*v/tot) for k,v in c.most_common(6))))
print("\n-- comparatif visuel du cadran, a la MEME echelle CSS")
ims=[]
for cle in ['canon','j1920']:
    im,f=ouvrir(cle,taire=True); a=ANC[cle]
    R=26.0
    b=(int((a['cx']-R)*f),int((a['cy']-R)*f),int((a['cx']+R)*f),int((a['cy']+R)*f))
    ims.append(im.crop(b).resize((int(2*R*9),int(2*R*9)),Image.LANCZOS))
out=Image.new('RGB',(ims[0].size[0]*2+16,ims[0].size[1]),(0,0,0))
out.paste(ims[0],(0,0)); out.paste(ims[1],(ims[0].size[0]+16,0))
out.save('z_cadran_cote_a_cote.png'); print("   [ecrit] z_cadran_cote_a_cote.png (canon a gauche, jeu a droite, meme echelle CSS)")
