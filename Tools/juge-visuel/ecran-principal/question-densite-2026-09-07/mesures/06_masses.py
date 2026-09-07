#!/usr/bin/env python3
"""06 - Ou vit le bati : profil vertical/horizontal, bande occupee, masses connexes,
et 'vie' (lumiere artificielle) mesuree DANS LA SCENE SEULE (le texte du bandeau
est chaud lui aussi : le compter serait une faute de population)."""
from PIL import Image, ImageFilter, ImageChops
import os
D=os.path.dirname(__file__)
im = Image.open(os.path.join(D,'..','capture-nuit-1080x1920.png')).convert('RGB')
W,H=im.size; p=im.load()
print("taille source : %d x %d" % (W,H))
Y0,Y1,B = 142,1684,24
L = im.convert('L')
amp = ImageChops.subtract(L.filter(ImageFilter.MaxFilter(9)), L.filter(ImageFilter.MinFilter(9)))
pa=amp.load()
def is_eau(r,g,b): return (g-r)>=30 and (b-r)>=45
def overlay(x,y):
    if 228<=y<=266: return True
    if (x-540)**2+(y-97)**2 <= 92*92: return True
    if abs(x-540)<12 and 214<=y<=232: return True
    return False

bat=set()
for by in range(Y0,Y1,B):
    for bx in range(0,W,B):
        n=h=e=0
        for x in range(bx,min(bx+B,W)):
            for y in range(by,min(by+B,Y1)):
                n+=1
                if pa[x,y]>=12: h+=1
                if is_eau(*p[x,y]): e+=1
        if n and e/n<0.5 and h/n>=0.60: bat.add((bx,by))
print("blocs %dx%d : %d blocs BATIS sur %d blocs de scene" % (B,B,len(bat),(W//B)*((Y1-Y0)//B+1)))

def isbat(x,y): return ((x//B)*B, ((y-Y0)//B)*B+Y0) in bat

print("\n== PROFIL VERTICAL : part BATIE de chaque bande de 40 px (hors eau et overlays) ==")
rows=[]
for y0 in range(Y0,Y1,40):
    y1=min(y0+40,Y1); b=0; n=0
    for y in range(y0,y1):
        for x in range(0,W,2):
            if overlay(x,y): continue
            n+=1
            if isbat(x,y): b+=1
    f=b/n if n else 0; rows.append((y0,y1,f))
    print("  y %4d-%4d  bati=%5.1f%%  %s" % (y0,y1-1,100*f,'#'*int(f*60)))

tot=sum((y1-y0)*f for y0,y1,f in rows)
acc=0; lo=hi=None
for y0,y1,f in rows:
    acc+=(y1-y0)*f
    if lo is None and acc>=0.05*tot: lo=y0
    if hi is None and acc>=0.95*tot: hi=y1
print("\n  bande qui porte 90%% du bati : y %d -> %d  (%d px = %.1f%% de la HAUTEUR D'ECRAN)" % (lo,hi,hi-lo,100*(hi-lo)/H))
print("  au-dessus (scene, y %d-%d) : %d px = %.1f%% de l'ecran" % (Y0,lo,lo-Y0,100*(lo-Y0)/H))
print("  au-dessous (scene, y %d-%d) : %d px = %.1f%% de l'ecran" % (hi,Y1,Y1-hi,100*(Y1-hi)/H))

print("\n== PROFIL HORIZONTAL : part BATIE de chaque colonne de 60 px ==")
for x0 in range(0,W,60):
    x1=min(x0+60,W); b=0;n=0
    for x in range(x0,x1,2):
        for y in range(Y0,Y1,2):
            if overlay(x,y) or is_eau(*p[x,y]): continue
            n+=1
            if isbat(x,y): b+=1
    print("  x %4d-%4d  bati=%5.1f%%  %s" % (x0,x1-1,100*b/n,'#'*int(60*b/n)))

print("\n== MASSES BATIES CONNEXES (blocs 4-connexes) ==")
seen=set(); comps=[]
for c in bat:
    if c in seen: continue
    stack=[c]; seen.add(c); cur=[]
    while stack:
        (x,y)=stack.pop(); cur.append((x,y))
        for d in ((B,0),(-B,0),(0,B),(0,-B)):
            n=(x+d[0],y+d[1])
            if n in bat and n not in seen: seen.add(n); stack.append(n)
    comps.append(cur)
comps.sort(key=len, reverse=True)
print("  composantes totales : %d" % len(comps))
print("  composantes >= 4 blocs (>=2304 px) : %d" % sum(1 for c in comps if len(c)>=4))
for i,c in enumerate(comps[:6]):
    xs=[a for a,_ in c]; ys=[b_ for _,b_ in c]
    print("    #%d : %4d blocs (%6d px, %4.1f%% de la scene)  bbox x[%d..%d] y[%d..%d]"
          % (i+1,len(c),len(c)*B*B,100*len(c)*B*B/(W*(Y1-Y0)),min(xs),max(xs)+B,min(ys),max(ys)+B))
print("  -> lecture : le bati n'est pas un semis d'objets separes, il forme %d masse(s) principale(s)."
      % sum(1 for c in comps if len(c)>=40))

print("\n== 'VIE' : lumiere artificielle DANS LA SCENE SEULE (r-b>=8) ==")
for y0 in range(Y0,Y1,140):
    y1=min(y0+140,Y1); n=c=0
    for y in range(y0,y1):
        for x in range(0,W,2):
            if overlay(x,y): continue
            n+=1
            if p[x,y][0]-p[x,y][2] >= 8: c+=1
    print("  y %4d-%4d  chauds=%5.2f%%  %s" % (y0,y1-1,100*c/n,'*'*int(100*c/n/2)))
n=c=0
for y in range(Y0,Y1):
    for x in range(0,W,2):
        if overlay(x,y): continue
        n+=1
        if p[x,y][0]-p[x,y][2]>=8: c+=1
print("  TOTAL scene : %.2f%% de pixels chauds" % (100*c/n))
