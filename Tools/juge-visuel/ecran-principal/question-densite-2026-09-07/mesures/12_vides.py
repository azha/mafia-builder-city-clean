#!/usr/bin/env python3
"""12 - Les VIDES : plus grande plage de sol nu contigu, et sa place a l'ecran.
Un vide se juge a sa PLUS GRANDE PLAGE, pas a son total : 40% de vide en fines
rues se percoit dense, 40% en une seule plage se percoit desert."""
from PIL import Image, ImageFilter, ImageChops, ImageDraw
import os
D=os.path.dirname(__file__)
im=Image.open(os.path.join(D,'..','capture-nuit-1080x1920.png')).convert('RGB')
W,H=im.size; p=im.load(); print("taille source : %d x %d"%(W,H))
Y0,Y1,B=142,1684,24
L=im.convert('L')
amp=ImageChops.subtract(L.filter(ImageFilter.MaxFilter(9)),L.filter(ImageFilter.MinFilter(9))); pa=amp.load()
def is_eau(c): return (c[1]-c[0])>=30 and (c[2]-c[0])>=45
def overlay(x,y): return (228<=y<=266) or ((x-540)**2+(y-97)**2<=92*92) or (abs(x-540)<12 and 214<=y<=232)
bat=set(); vide=set()
for by in range(Y0,Y1,B):
    for bx in range(0,W,B):
        n=h=e=o=0
        for x in range(bx,min(bx+B,W)):
            for y in range(by,min(by+B,Y1)):
                n+=1
                if pa[x,y]>=12: h+=1
                if is_eau(p[x,y]): e+=1
                if overlay(x,y): o+=1
        if not n: continue
        if e/n>=0.5 or o/n>=0.5: continue
        (bat if h/n>=0.60 else vide).add((bx,by))
print("blocs BATIS=%d  blocs SOL NU=%d" % (len(bat),len(vide)))
def cc(S):
    seen=set(); out=[]
    for c in S:
        if c in seen: continue
        st=[c]; seen.add(c); cur=[]
        while st:
            x,y=st.pop(); cur.append((x,y))
            for dx,dy in ((B,0),(-B,0),(0,B),(0,-B)):
                n=(x+dx,y+dy)
                if n in S and n not in seen: seen.add(n); st.append(n)
        out.append(cur)
    return sorted(out,key=len,reverse=True)
v=cc(vide)
print("\n== PLUS GRANDES PLAGES DE SOL NU CONTIGU ==")
for i,c in enumerate(v[:5]):
    xs=[a for a,_ in c]; ys=[b for _,b in c]
    print("  #%d : %4d blocs = %6d px = %4.1f%% de l'ECRAN   bbox x[%d..%d] y[%d..%d]"
          % (i+1,len(c),len(c)*B*B,100*len(c)*B*B/(W*H),min(xs),max(xs)+B,min(ys),max(ys)+B))
print("\n== A COMPARER : plus grandes masses BATIES contigues ==")
for i,c in enumerate(cc(bat)[:3]):
    xs=[a for a,_ in c]; ys=[b for _,b in c]
    print("  #%d : %4d blocs = %6d px = %4.1f%% de l'ECRAN   bbox x[%d..%d] y[%d..%d]"
          % (i+1,len(c),len(c)*B*B,100*len(c)*B*B/(W*H),min(xs),max(xs)+B,min(ys),max(ys)+B))
ann=im.copy(); d=ImageDraw.Draw(ann)
for j,col in ((0,(250,220,60)),(1,(255,140,0)),(2,(255,80,200))):
    if j<len(v):
        for (x,y) in v[j]: d.rectangle([x,y,x+B-1,y+B-1],outline=col)
ann.resize((540,960)).save(os.path.join(D,'12_vides.png')); print("\necrit 12_vides.png")
