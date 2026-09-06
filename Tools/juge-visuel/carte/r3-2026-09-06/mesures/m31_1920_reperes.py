# m31 - 1080x1920 : echelle et cadrage par DEUX REPERES peints dans la texture
#   (a) "LE THRENNY" (encre bleu clair, unique)  (b) "LE PORT" (encre bleu-gris, unique)
# Le rapport des distances donne l'echelle, un repere donne la translation.
# CONTROLE : la meme procedure appliquee a la capture 2400 doit rendre s=1,0221 / ty=+8.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import statistics
ref=Image.open('../reference-1080x2102.png').convert('RGB')
c24=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB')
c19=Image.open('../capture-1080x1920.png').convert('RGB')
print('ref',ref.size,'c24',c24.size,'c19',c19.size)
def coldf(p): return p[2]>=p[1]>=p[0]-6 and (p[2]-p[0])>=10
def blob(im,box,filtre,Lmin):
    px=im.load(); W,H=im.size
    x0,y0,x1,y1=[int(v) for v in box]
    pts=[(x,y) for y in range(max(0,y0),min(H,y1)) for x in range(max(0,x0),min(W,x1)) if filtre(px[x,y]) and L(px[x,y])>Lmin]
    if len(pts)<50: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return dict(n=len(pts),cx=sum(xs)/len(xs),cy=sum(ys)/len(ys),x0=min(xs),x1=max(xs),y0=min(ys),y1=max(ys))
# reperes cote reference
TH=blob(ref,(400,1110,690,1170),coldf,110)
PO=blob(ref,(700,240,900,290),lambda p:p[2]>=p[1]>=p[0]-8 and (p[2]-p[0])>=6,90)
print('REF  THRENNY',TH); print('REF  PORT   ',PO)
def solve(im,boxT,boxP,lab):
    t=blob(im,boxT,coldf,110); p=blob(im,boxP,lambda q:q[2]>=q[1]>=q[0]-8 and (q[2]-q[0])>=6,90)
    if not t or not p: print(lab,'repere manquant',t is None,p is None); return
    s=(t['cy']-p['cy'])/(TH['cy']-PO['cy'])
    sx=(t['x1']-t['x0'])/(TH['x1']-TH['x0'])
    ty=t['cy']-s*TH['cy']; tx=t['cx']-s*TH['cx']
    print(f'{lab}: THRENNY c=({t["cx"]:.1f},{t["cy"]:.1f}) larg={t["x1"]-t["x0"]}  PORT c=({p["cx"]:.1f},{p["cy"]:.1f})')
    print(f'   s (par la distance verticale des deux reperes) = {s:.4f} ; s (par la largeur de THRENNY) = {sx:.4f}')
    print(f'   tx={tx:.1f}  ty={ty:.1f}')
    print(f'   -> le contenu de la maquette (y 219..2101) occupe y {219*s+ty:.1f} .. {2101*s+ty:.1f}')
    print(f'   -> x : ref 0 -> {tx:.1f} ; ref 1079 -> {1079*s+tx:.1f}')
    return s,tx,ty
print('\nCONTROLE — capture 2400 (attendu s=1,0221 tx=-11,9 ty=+8,2)')
solve(c24,(400,1130,700,1200),(700,250,910,310),'  2400')
print('\nCAPTURE 1920')
solve(c19,(380,880,720,990),(680,20,920,90),'  1920')
