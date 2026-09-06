# m26 - DOCK : cercles, ICONES, libelles ; et profil radial de l'anneau du medaillon.
# Echelle CSS-HUD (canon x3, capture x2,7551).
from PIL import Image
import statistics, math
CAN=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
CAP=Image.open('../capture-1080x2400.png').convert('RGB')
print('canon',CAN.size,'capture',CAP.size)
KC=CAN.size[0]/392.0; KP=CAP.size[0]/392.0
def Lum(p): return 0.299*p[0]+0.587*p[1]+0.114*p[2]
print('\n--- ANNEAU DU MEDAILLON : profil radial depuis le centre (CSS 196 ; y du centre = 39) ---')
for lab,im,K in (('canon',CAN,KC),('capture',CAP,KP)):
    px=im.load()
    cx,cy=196.0*K,39.0*K
    print(f'  {lab} (centre px {cx:.0f},{cy:.0f}) : L et couleur le long du rayon HORIZONTAL droit')
    out=[]
    for r_css in [i*0.5 for i in range(56,84)]:
        x=int(round(cx+r_css*K)); y=int(round(cy))
        p=px[x,y]; out.append(f'{r_css:.1f}:{Lum(p):.0f}')
    print('    '+' '.join(out))
print('\n--- DOCK : detection des 4 pastilles ---')
def pastilles(im,K,y0,y1,lab):
    px=im.load(); W,H=im.size
    fond=statistics.median([Lum(px[x,y]) for y in range(y0,y1) for x in range(0,W,13)])
    cols={}
    for y in range(y0,y1):
        for x in range(W):
            if Lum(px[x,y])>fond+12: cols.setdefault(x,[]).append(y)
    xs=sorted(cols); grp=[];cur=[xs[0]]
    for x in xs[1:]:
        if x-cur[-1]<=8: cur.append(x)
        else: grp.append(cur); cur=[x]
    grp.append(cur); grp=[g for g in grp if (g[-1]-g[0])>10]
    print(f'  {lab} fond L={fond:.1f} ; {len(grp)} groupes :')
    for g in grp:
        ys=[y for x in g for y in cols[x]]
        print(f'    x {g[0]/K:7.2f}..{g[-1]/K:7.2f} CSS (l={(g[-1]-g[0]+1)/K:6.2f})  y {min(ys)/K:7.2f}..{max(ys)/K:7.2f} CSS  n={len(ys)}')
    return grp,fond
gc,fc=pastilles(CAN,KC,CAN.size[1]-250,CAN.size[1]-10,'canon  ')
gp,fp=pastilles(CAP,KP,2185,2390,'capture')
print('\n--- ICONE au centre de chaque pastille (disque de rayon 40 % du cercle) ---')
def icones(im,K,centres,cy_css,r_css,fond,lab):
    px=im.load()
    for c in centres:
        cx=int(c*K); cy=int(cy_css*K); r=max(3,int(r_css*K*0.42))
        vals=sorted(Lum(px[x,y]) for y in range(cy-r,cy+r+1) for x in range(cx-r,cx+r+1) if (x-cx)**2+(y-cy)**2<=r*r)
        n=len(vals)
        clair=sum(1 for v in vals if v>fond+28)
        print(f'  {lab} pastille x={c:6.2f} CSS : L med {vals[n//2]:6.1f}  p95 {vals[int(n*0.95)]:6.1f}  max {vals[-1]:6.1f}  px > fond+28 : {clair}/{n} ({100*clair/n:.1f} %)')
# centres lus des groupes
def centres(grp,K): return [ (g[0]+g[-1])/2/K for g in grp ]
print('  (canon : cercles a partir des groupes ; capture idem)')
icones(CAN,KC,[100.0,163.0,229.0,296.0],(CAN.size[1]-250+90)/KC,22.5,fc,'canon  ')
icones(CAP,KP,[ 96.0,162.0,229.0,296.0], 2265/KP,22.5,fp,'capture')
print('\n--- LIBELLES du dock : couleur et hauteur de capitale ---')
def libelle(im,K,box,lab):
    px=im.load(); x0,y0,x1,y1=[int(v) for v in box]
    pts=[(x,y,px[x,y]) for y in range(y0,y1) for x in range(x0,x1) if Lum(px[x,y])>110]
    if not pts: print('  ',lab,'rien'); return
    ys=[p[1] for p in pts]; xs=[p[0] for p in pts]
    col=(statistics.median([p[2][0] for p in pts]),statistics.median([p[2][1] for p in pts]),statistics.median([p[2][2] for p in pts]))
    print(f'  {lab} n={len(pts)} capitale {(max(ys)-min(ys)+1)/K:.2f} CSS largeur {(max(xs)-min(xs)+1)/K:.2f} CSS couleur {col}')
libelle(CAN,KC,(70*KC,CAN.size[1]-80,135*KC,CAN.size[1]-40),'canon   EMPIRE')
libelle(CAP,KP,(70*KP,2300,135*KP,2345),'capture EMPIRE')
