# m16 : tout ce qui differe HORS plaques et HORS zones deja identifiees.
# Objectif : ne pas rater une partie EN TROP ou ABSENTE non encore inventoriee.
# Controle positif : les zones connues (ecussons 1..6, halo or, quartiers khaki,
# ligne d'aide, legende) doivent ressortir ; le reste doit etre plat.
from PIL import Image, ImageFilter
import statistics
S,DX,DY=1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
rr=ref.resize((int(1080*S),int(2102*S)),Image.LANCZOS)
canv=Image.new('RGB',(1080,2400)); canv.paste(rr,(DX,DY))
a=canv.filter(ImageFilter.GaussianBlur(4)).load(); b=cap.filter(ImageFilter.GaussianBlur(4)).load()
plaques=[(835,462,1011,495),(462,479,638,512),(78,483,254,516),(853,682,1029,714),
(492,703,668,736),(91,709,267,742),(841,940,1017,973),(94,943,270,975),(484,945,660,978),
(76,1402,252,1435),(839,1406,1015,1440),(463,1421,639,1454),(829,1666,1005,1699),
(63,1680,240,1713),(441,1687,617,1720),(816,1943,993,1975),(75,1955,251,1992),(440,1960,616,1993)]
def surplaque(x,y): return any(X0-14<=x<=X1+14 and Y0-14<=y<=Y1+14 for X0,Y0,X1,Y1 in plaques)
CW=CH=24
cells=[]
for cy in range(240,2140,CH):
    for cx in range(0,1056,CW):
        if surplaque(cx+12,cy+12): continue
        s=0;n=0; sd=[0,0,0]
        for y in range(cy,cy+CH,2):
            for x in range(cx,cx+CW,2):
                p,q=a[x,y],b[x,y]
                for k in range(3): sd[k]+=q[k]-p[k]
                s+=sum(abs(q[k]-p[k]) for k in range(3)); n+=3
        cells.append((cx,cy,s/n,tuple(round(v/(n/3),1) for v in sd)))
cells.sort(key=lambda c:-c[2])
vals=[c[2] for c in cells]
print(f"cellules 24x24 hors plaques : {len(cells)} ; median {statistics.median(vals):.2f} ; 99e centile {sorted(vals)[int(.99*len(vals))]:.2f}")
print(f"nb cellules > 20/255 : {sum(1 for v in vals if v>20)}")
# regrouper les cellules > 20 en blocs
gros=[c for c in cells if c[2]>20]
gros.sort(key=lambda c:(c[1],c[0]))
blocs=[]
for c in gros:
    place=False
    for b_ in blocs:
        if any(abs(c[0]-d[0])<=CW*2 and abs(c[1]-d[1])<=CH*2 for d in b_): b_.append(c); place=True; break
    if not place: blocs.append([c])
# fusion transitive grossiere
chg=True
while chg:
    chg=False
    for i in range(len(blocs)):
        for j in range(i+1,len(blocs)):
            if any(abs(p[0]-q[0])<=CW*2 and abs(p[1]-q[1])<=CH*2 for p in blocs[i] for q in blocs[j]):
                blocs[i]+=blocs[j]; del blocs[j]; chg=True; break
        if chg: break
blocs.sort(key=lambda b_:-len(b_))
print(f"\n{len(blocs)} zones de difference hors plaques :")
print(f"{'#':>3} {'x0':>5} {'y0':>5} {'x1':>5} {'y1':>5} {'cells':>6} {'|d|max':>7}  dR,dG,dB moyen (capture - reference)")
for i,b_ in enumerate(blocs,1):
    xs=[c[0] for c in b_]; ys=[c[1] for c in b_]
    dm=max(c[2] for c in b_)
    mr=sum(c[3][0] for c in b_)/len(b_); mg=sum(c[3][1] for c in b_)/len(b_); mb=sum(c[3][2] for c in b_)/len(b_)
    print(f"{i:>3} {min(xs):>5} {min(ys):>5} {max(xs)+CW:>5} {max(ys)+CH:>5} {len(b_):>6} {dm:>7.1f}  {mr:+7.1f} {mg:+7.1f} {mb:+7.1f}")
