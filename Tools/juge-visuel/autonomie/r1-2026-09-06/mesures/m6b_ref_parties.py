# m6b — inventaire geometrique de la REFERENCE (detecteur LCD resserre).
from PIL import Image
ref=Image.open('../reference-1080x2102.png').convert('RGB'); px=ref.load()
print('OUVERT reference', ref.size)
def med(x0,y0,x1,y1):
    p=list(ref.crop((x0,y0,x1,y1)).getdata()); n=len(p)
    return tuple(sorted(q[c] for q in p)[n//2] for c in range(3))
# LCD : vert (g>r+6 et g>b+10), sous le badge BIP
xs=[];ys=[]
for y in range(340,ref.height):
    for x in range(ref.width):
        r,g,b=px[x,y]
        if g>r+6 and g>b+10: xs.append(x);ys.append(y)
print('LCD bbox: x %d..%d (w=%d)  y %d..%d (h=%d)'%(min(xs),max(xs),max(xs)-min(xs)+1,min(ys),max(ys),max(ys)-min(ys)+1))
L=(min(xs),min(ys),max(xs),max(ys))
print('  -> largeur LCD = %.1f %% de l ecran ; hauteur = %.1f %% de la hauteur de l image'%(100.0*(L[2]-L[0]+1)/1080, 100.0*(L[3]-L[1]+1)/2102))
print('  fond LCD (centre vide) =', med(500,1150,600,1250))
print('  encre LCD (texte MESSAGES 2) =', med(430,405,620,425))

FOND=med(20,1600,60,1660)
print('fond chassis =',FOND)
def ink(p,t=12): return max(abs(p[i]-FOND[i]) for i in range(3))>t
rows=[]
for y in range(L[3]+6, ref.height):
    n=sum(1 for x in range(ref.width) if ink(px[x,y]))
    rows.append((y,n))
runs=[];cur=None
for y,n in rows:
    if n>25 and cur is None: cur=y
    elif n<=25 and cur is not None: runs.append((cur,y-1)); cur=None
if cur is not None: runs.append((cur,ref.height-1))
print('bandes d encre sous le LCD :')
for a,b in runs: print('   y %4d..%4d  h=%3d'%(a,b,b-a+1))
# colonnes de la 1re bande (rangee LIRE/OK/OPTIONS)
if runs:
    a,b=runs[0]
    cols=[x for x in range(ref.width) if any(ink(px[x,y]) for y in range(a,b+1))]
    # segments
    seg=[];cur=None;prev=None
    for x in cols:
        if cur is None: cur=x
        elif x-prev>8: seg.append((cur,prev)); cur=x
        prev=x
    if cur is not None: seg.append((cur,prev))
    print('  segments horizontaux de la bande y%d..%d :'%(a,b), seg)
