#!/usr/bin/env python3
"""09 - Marqueurs jouables : detecteur REPARE.
Le detecteur de 08 rendait 0 et son controle positif a REFUSE ce zero : l'anneau
mesure 14x14 px et 52 pixels ambre, pas les 110 px/28 px que j'avais supposes.
La taille est desormais MESUREE sur le temoin, pas supposee."""
from PIL import Image, ImageDraw
import os
D=os.path.dirname(__file__)
im=Image.open(os.path.join(D,'..','capture-nuit-1080x1920.png')).convert('RGB')
W,H=im.size; p=im.load(); print("taille source : %d x %d"%(W,H))
Y0,Y1=142,1684
m={(x,y) for y in range(Y0,Y1) for x in range(W)
   if p[x,y][0]>=150 and p[x,y][0]-p[x,y][2]>=90 and p[x,y][1]-p[x,y][2]>=55}
seen=set(); cand=[]; rejets=0
for c in m:
    if c in seen: continue
    st=[c]; seen.add(c); cur=[]
    while st:
        x,y=st.pop(); cur.append((x,y))
        for dx in (-1,0,1):
            for dy in (-1,0,1):
                n=(x+dx,y+dy)
                if n in m and n not in seen: seen.add(n); st.append(n)
    xs=[a for a,_ in cur]; ys=[b for _,b in cur]
    w,h=max(xs)-min(xs)+1,max(ys)-min(ys)+1
    if len(cur)>=25 and 10<=w<=26 and 10<=h<=26 and 0.6<=w/h<=1.6:
        cand.append((sum(xs)//len(cur),sum(ys)//len(cur),len(cur),w,h))
    else: rejets+=1
cand.sort(key=lambda t:(t[1],t[0]))
print("composantes ambre rejetees (taille/forme) : %d" % rejets)
print("MARQUEURS RETENUS : %d" % len(cand))
for cx,cy,n,w,h in cand: print("   (%4d,%4d) n=%3d bbox=%dx%d" % (cx,cy,n,w,h))
print("\n-- CONTROLE POSITIF : le marqueur temoin repere a l'oeil vers (348,551) est-il trouve ? %s"
      % ("OUI" if any(abs(cx-348)<12 and abs(cy-551)<12 for cx,cy,_,_,_ in cand) else "NON -> detecteur ENCORE faux"))
print("-- CONTROLE POSITIF 2 : un second temoin vers (540,551) ? %s"
      % ("OUI" if any(abs(cx-540)<12 and abs(cy-551)<12 for cx,cy,_,_,_ in cand) else "NON"))
print("-- CONTROLE NEGATIF : marqueurs dans l'eau libre (y>1560 et x<700) : %d (attendu 0)"
      % sum(1 for cx,cy,_,_,_ in cand if cy>1560 and cx<700))
print("-- CONTROLE NEGATIF : marqueurs dans le ciel/sol vide du haut (y<430) : %d (attendu 0)"
      % sum(1 for cx,cy,_,_,_ in cand if cy<430))
ann=im.copy(); d=ImageDraw.Draw(ann)
for cx,cy,_,_,_ in cand:
    d.ellipse([cx-20,cy-20,cx+20,cy+20],outline=(0,255,0),width=3)
ann.crop((0,420,1080,1400)).save(os.path.join(D,'09_marqueurs.png'))
print("ecrit 09_marqueurs.png")
