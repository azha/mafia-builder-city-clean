# m25 - chrome, suite : medaillon par COUPE VERTICALE au centre, barre or par COUPE HORIZONTALE,
# dock (cercles, icones, libelles). Tout en CSS-HUD.
from PIL import Image
import statistics
CAN=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
CAP=Image.open('../capture-1080x2400.png').convert('RGB')
print('canon',CAN.size,'capture',CAP.size)
KC=CAN.size[0]/392.0; KP=CAP.size[0]/392.0
def Lum(p): return 0.299*p[0]+0.587*p[1]+0.114*p[2]
def sat(p): return max(p)-min(p)
print('\n--- MEDAILLON : coupe VERTICALE a x = milieu ---')
for lab,im,K in (('canon',CAN,KC),('capture',CAP,KP)):
    px=im.load(); W,H=im.size; x=W//2
    print(f'  {lab} x={x} :')
    for y in range(0,int(105*K)):
        p=px[x,y]
        if sat(p)>45 and Lum(p)>60:
            print(f'    y={y} ({y/K:5.2f} CSS) {p} sat={sat(p)}')
print('\n--- MEDAILLON : coupe HORIZONTALE a la hauteur du pivot ---')
def coupe_h(im,K,y,lab):
    px=im.load(); W,H=im.size
    hits=[x for x in range(int(0.30*W),int(0.70*W)) if sat(px[x,y])>45 and Lum(px[x,y])>60]
    if not hits: print(f'  {lab} y={y}: rien'); return
    seg=[];s=hits[0];p=hits[0]
    for x in hits[1:]:
        if x<=p+2: p=x
        else: seg.append((s,p)); s=x; p=x
    seg.append((s,p))
    print(f'  {lab} y={y} ({y/K:.2f} CSS) segments CSS : '+' | '.join(f'{a/K:.2f}..{b/K:.2f}' for a,b in seg))
print('\n--- BARRE OR : coupe horizontale ---')
def barre(im,K,ylo,yhi,lab):
    px=im.load(); W,H=im.size
    best=None
    for y in range(ylo,yhi):
        n=sum(1 for x in range(0,int(0.35*W)) if sat(px[x,y])>60 and Lum(px[x,y])>100)
        if best is None or n>best[0]: best=(n,y)
    y=best[1]
    print(f'  {lab} ligne la plus doree y={y} ({y/K:.2f} CSS), n={best[0]}')
    prev=None
    for x in range(0,int(0.35*W)):
        p=px[x,y]
        cls = 'OR' if (sat(p)>60 and Lum(p)>100) else ('GRIS' if (Lum(p)>55 and sat(p)<45) else '.')
        if cls!=prev:
            print(f'    x={x} ({x/K:6.2f} CSS) -> {cls}  {p}')
            prev=cls
barre(CAN,KC,110,140,'canon  ')
barre(CAP,KP,105,135,'capture')
print('\n--- DOCK ---')
def dock(im,K,y0,y1,lab):
    px=im.load(); W,H=im.size
    # anneau des cercles : pixels plus clairs que le fond du dock
    fond=statistics.median([Lum(px[x,y]) for y in range(y0,y1) for x in range(0,W,17)])
    print(f'  {lab} fond du dock L={fond:.1f}')
    cols={}
    for y in range(y0,y1):
        for x in range(W):
            if Lum(px[x,y])>fond+14: cols.setdefault(x,[]).append(y)
    xs=sorted(cols)
    grp=[];cur=[xs[0]]
    for x in xs[1:]:
        if x-cur[-1]<=6: cur.append(x)
        else: grp.append(cur); cur=[x]
    grp.append(cur)
    grp=[g for g in grp if len(g)>18]
    print(f'  {lab} : {len(grp)} groupes de colonnes claires')
    for g in grp:
        ys=[y for x in g for y in cols[x]]
        print(f'     x {g[0]/K:6.2f}..{g[-1]/K:6.2f} CSS (larg {(g[-1]-g[0]+1)/K:5.2f})  y {min(ys)/K:6.2f}..{max(ys)/K:6.2f} CSS  n={len(ys)}')
dock(CAN,KC,CAN.size[1]-250,CAN.size[1]-8,'canon  ')
dock(CAP,KP,2180,2395,'capture')
print('\n--- ICONES dans les cercles : luminance max au CENTRE de chaque pastille ---')
def icone(im,K,cy_css,centres_css,r_css,lab):
    px=im.load(); W,H=im.size
    for c in centres_css:
        cx=int(c*K); cy=int(cy_css*K); r=int(r_css*K*0.55)
        vals=[Lum(px[x,y]) for y in range(cy-r,cy+r) for x in range(cx-r,cx+r) if (x-cx)**2+(y-cy)**2<r*r]
        vals.sort()
        print(f'  {lab} pastille x={c:.1f} CSS : L median {vals[len(vals)//2]:.1f}  p99 {vals[int(len(vals)*0.99)]:.1f}  max {vals[-1]:.1f}  (n={len(vals)})')
