# m6 — inventaire geometrique de la REFERENCE : parties du telephone.
from PIL import Image
ref=Image.open('../reference-1080x2102.png').convert('RGB'); px=ref.load()
print('OUVERT reference', ref.size)
def med(x0,y0,x1,y1):
    p=list(ref.crop((x0,y0,x1,y1)).getdata()); n=len(p)
    return tuple(sorted(q[c] for q in p)[n//2] for c in range(3))

# 1) LCD : fond vert tres sombre. Echantillon au centre de la zone vide
print('echantillon fond LCD (x 500..560, y 1100..1160) =', med(500,1100,560,1160))
fondlcd=med(500,1100,560,1160)
def isLcd(p, tol=14):
    return all(abs(p[i]-fondlcd[i])<=tol for i in range(3))
xs=[];ys=[]
for y in range(229,ref.height):
    for x in range(ref.width):
        if isLcd(px[x,y]): xs.append(x);ys.append(y)
print('LCD (fond) bbox: x %d..%d (w=%d)  y %d..%d (h=%d)'%(min(xs),max(xs),max(xs)-min(xs)+1,min(ys),max(ys),max(ys)-min(ys)+1))
LCD=(min(xs),min(ys),max(xs),max(ys))

# 2) badge BIP : vert vif
xs=[];ys=[]
for y in range(229,400):
    for x in range(ref.width):
        r,g,b=px[x,y]
        if g>150 and g>r+30 and g>b+60: xs.append(x);ys.append(y)
print('badge BIP bbox: x %d..%d (w=%d) y %d..%d (h=%d)  couleur=%s'%(min(xs),max(xs),max(xs)-min(xs)+1,min(ys),max(ys),max(ys)-min(ys)+1, med(90,270,150,300)))

# 3) rangee LIRE / OK / OPTIONS + pave : encre sous le LCD
FOND=med(20,1600,60,1660)
print('fond chassis sous LCD =',FOND)
def ink(p,t=12): return max(abs(p[i]-FOND[i]) for i in range(3))>t
rows=[]
for y in range(LCD[3]+1, ref.height):
    n=sum(1 for x in range(ref.width) if ink(px[x,y]))
    rows.append((y,n))
runs=[];cur=None
for y,n in rows:
    if n>20 and cur is None: cur=y
    elif n<=20 and cur is not None: runs.append((cur,y-1)); cur=None
if cur is not None: runs.append((cur,ref.height-1))
print('bandes d encre sous le LCD (y0,y1,h):')
for a,b in runs: print('   %4d..%4d  h=%d'%(a,b,b-a+1))
