import sys; sys.path.insert(0,'.')
from lib import *
print("=== m32 : chrome (bandeau) — capture vs canon HUD (1176 px = 392 CSS ; capture 1080 px = 392 CSS) ===")
print("    facteur canon->capture = 1080/1176 = 0,9184")
K=1080/1176
canon=ouvrir('../hud-canon-1176.png'); cap=ouvrir('../capture-1080x2400.png')
pk,pc=px(canon),px(cap)
def rule_or(p,W,H,y0,y1):
    for y in range(y0,y1):
        n=sum(1 for x in range(0,W) if est_or(p[x,y]))
        if n>0.5*W: return y,n
    return None
print(f"  canon : filet bas du bandeau (or) = {rule_or(pk,1176,2091,100,300)}  -> en px capture = {rule_or(pk,1176,2091,100,300)[0]*K:.0f}")
# capture : la ligne pleine largeur sous le bandeau est ROUGE
def rule_rouge(p,W,y0,y1):
    for y in range(y0,y1):
        n=sum(1 for x in range(0,W) if p[x,y][0]-p[x,y][2]>25 and p[x,y][0]>60)
        if n>0.5*W: return y,n
    return None
print(f"  capture : filet bas du bandeau (rouge) = {rule_rouge(pc,1080,100,300)}")
print(f"  capture : filet OR pleine largeur sous le bandeau ? {rule_or(pc,1080,2400,100,300)}")
def encre(im,x0,y0,x1,y1,frac=0.5):
    p=px(im); L=[[lum(p[x,y]) for x in range(x0,x1)] for y in range(y0,y1)]
    plat=sorted(v for r in L for v in r); fond=plat[len(plat)//4]; haut=plat[-max(1,len(plat)//80)]
    s=fond+frac*(haut-fond)
    pts=[(x0+i,y0+j) for j,r in enumerate(L) for i,v in enumerate(r) if v>=s]
    xs=sorted(set(a for a,_ in pts)); ys=[b for _,b in pts]
    g=[]
    for x in xs:
        if g and x-g[-1][-1]<=2: g[-1].append(x)
        else: g.append([x])
    return min(xs),max(xs),min(ys),max(ys),len(g),len(pts)
a=encre(canon,30,30,220,60); b=encre(cap,30,25,240,55)
print(f"  « ARGENT » canon : x{a[0]}..{a[1]} (l={a[1]-a[0]+1}) cap={a[3]-a[2]+1} px, {a[4]} groupes -> ramene a l'echelle capture : l={(a[1]-a[0]+1)*K:.0f} cap={(a[3]-a[2]+1)*K:.1f}")
print(f"  « ARGENT » capture: x{b[0]}..{b[1]} (l={b[1]-b[0]+1}) cap={b[3]-b[2]+1} px, {b[4]} groupes")
print(f"  -> largeur du mot : {100*((b[1]-b[0]+1)/((a[1]-a[0]+1)*K)-1):+.1f} %  ; hauteur de capitale : {100*((b[3]-b[2]+1)/((a[3]-a[2]+1)*K)-1):+.1f} %")
# aile droite
print()
print("  aile droite — lignes d'encre")
def lignes(p,x0,y0,x1,y1,seuil=90):
    out=[];cur=None
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(p[x,y])>seuil)
        if n>=3: cur=[y,y] if cur is None else [cur[0],y]
        else:
            if cur and cur[1]-cur[0]>=3: out.append(tuple(cur)); 
            cur=None
    if cur: out.append(tuple(cur))
    return out
print(f"    canon   x760..1150, y20..160 : {lignes(pk,760,20,1150,160)}")
print(f"    capture x700..1060, y15..145 : {lignes(pc,700,15,1060,145)}")
