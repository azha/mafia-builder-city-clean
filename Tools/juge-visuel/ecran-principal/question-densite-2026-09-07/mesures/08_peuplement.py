#!/usr/bin/env python3
"""08 - Ce qui PEUPLE la scene : marqueurs jouables, sources de lumiere, et
occupation de l'eau. Chaque detecteur porte son controle."""
from PIL import Image, ImageDraw
import os
D=os.path.dirname(__file__)
im=Image.open(os.path.join(D,'..','capture-nuit-1080x1920.png')).convert('RGB')
W,H=im.size; p=im.load(); print("taille source : %d x %d"%(W,H))
Y0,Y1=142,1684

def comps(mask, minpx):
    seen=set(); out=[]
    for c in mask:
        if c in seen: continue
        st=[c]; seen.add(c); cur=[]
        while st:
            x,y=st.pop(); cur.append((x,y))
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                n=(x+dx,y+dy)
                if n in mask and n not in seen: seen.add(n); st.append(n)
        if len(cur)>=minpx: out.append(cur)
    return out

# ---- 1. MARQUEURS JOUABLES (anneau ambre) ----
print("\n== MARQUEURS JOUABLES (anneau ambre : R>=150, R-B>=90, G-B>=55) ==")
m={(x,y) for y in range(Y0,Y1) for x in range(W)
   if p[x,y][0]>=150 and p[x,y][0]-p[x,y][2]>=90 and p[x,y][1]-p[x,y][2]>=55}
print("  pixels ambre dans la scene : %d" % len(m))
cand=[]
for c in comps(m,110):
    xs=[a for a,_ in c]; ys=[b for _,b in c]
    w,h=max(xs)-min(xs)+1, max(ys)-min(ys)+1
    if 18<=w<=44 and 18<=h<=44 and 0.7<=w/h<=1.4:
        cand.append((sum(xs)//len(xs), sum(ys)//len(ys), len(c), w, h))
cand.sort(key=lambda t:(t[1],t[0]))
print("  MARQUEURS RETENUS : %d" % len(cand))
for cx,cy,n,w,h in cand: print("    (%4d,%4d) n=%4d bbox=%dx%d" % (cx,cy,n,w,h))
print("  -- controle positif : un marqueur repere A L'OEIL vers (348,551) est-il dans la liste ? %s"
      % ("OUI" if any(abs(cx-348)<18 and abs(cy-551)<18 for cx,cy,_,_,_ in cand) else "NON -> detecteur faux"))
print("  -- controle negatif : aucun marqueur ne doit tomber dans l'eau libre (y>1560, x<700) : %d"
      % sum(1 for cx,cy,_,_,_ in cand if cy>1560 and cx<700))

# ---- 2. SOURCES DE LUMIERE (taches claires et chaudes) ----
print("\n== SOURCES DE LUMIERE (L>=150 et R>=B) ==")
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
bright={(x,y) for y in range(Y0,Y1) for x in range(W)
        if lum(p[x,y])>=150 and p[x,y][0]>=p[x,y][2]}
print("  pixels clairs+chauds : %d (%.2f%% de la scene)" % (len(bright),100*len(bright)/(W*(Y1-Y0))))
cl=comps(bright,25)
print("  taches distinctes >=25 px : %d" % len(cl))
bands={}
for c in cl:
    cy=sum(b for _,b in c)//len(c); bands.setdefault(cy//200*200,0); bands[cy//200*200]+=1
for k in sorted(bands): print("    y %4d-%4d : %3d taches" % (k,k+199,bands[k]))

# ---- 3. OCCUPATION DE L'EAU ----
print("\n== OCCUPATION DE L'EAU ==")
def is_eau(c): return (c[1]-c[0])>=30 and (c[2]-c[0])>=45
YW0,YW1=1400,Y1
eau={(x,y) for y in range(YW0,YW1) for x in range(W) if is_eau(p[x,y])}
print("  aire d'eau visible (y %d-%d) : %d px" % (YW0,YW1,len(eau)))
non={(x,y) for y in range(YW0,YW1) for x in range(W) if not is_eau(p[x,y])}
# objets POSES sur l'eau = composantes non-eau entourees d'eau (on borne par le bord du quai)
obj=[c for c in comps(non,200) if min(b for _,b in c)>1395]
obj.sort(key=len,reverse=True)
print("  composantes non-eau >=200 px dans la bande d'eau : %d" % len(obj))
for c in obj[:8]:
    xs=[a for a,_ in c]; ys=[b for _,b in c]
    print("    n=%6d px  bbox x[%d..%d] y[%d..%d]" % (len(c),min(xs),max(xs),min(ys),max(ys)))

ann=im.copy(); d=ImageDraw.Draw(ann)
for cx,cy,_,_,_ in cand: d.ellipse([cx-22,cy-22,cx+22,cy+22],outline=(0,255,0),width=3)
for c in cl:
    xs=[a for a,_ in c]; ys=[b for _,b in c]
    d.rectangle([min(xs)-2,min(ys)-2,max(xs)+2,max(ys)+2],outline=(255,0,255),width=1)
ann.save(os.path.join(D,'08_peuplement.png')); print("\necrit 08_peuplement.png (vert=marqueurs, magenta=taches lumineuses)")
