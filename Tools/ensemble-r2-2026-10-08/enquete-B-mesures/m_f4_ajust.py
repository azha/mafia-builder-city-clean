# F4 : ajustement de cercle (moindres carres, Python pur) sur les pixels de l'arc (teal+rouge) et de l'anneau d'or.
# Centre libre => insensible a une erreur de centre. Sorties : rayon median de l'arc / rayon exterieur de l'anneau, epaisseurs.
from PIL import Image
import colorsys, math
REF="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference/E03-cadre-48.png"
CAP="/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final/E03_Chanedappro_1080x2400.png"
def classe(c):
    r,g,b=[v/255 for v in c[:3]]
    h,s,v=colorsys.rgb_to_hsv(r,g,b); h*=360
    if s>0.25 and v>0.30 and 30<=h<=52: return 'or'
    if s>0.20 and v>0.22 and 165<=h<=200: return 'teal'
    if s>0.30 and v>0.30 and (h<=14 or h>=345): return 'rouge'
    return '.'
def solve3(M,v):
    # Cramer
    def det(m): return (m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]))
    D=det(M); out=[]
    for k in range(3):
        m=[row[:] for row in M]
        for i in range(3): m[i][k]=v[i]
        out.append(det(m)/D)
    return out
def fit(pts):
    S=[[0]*3 for _ in range(3)]; V=[0]*3
    for x,y in pts:
        row=[2*x,2*y,1]; b=x*x+y*y
        for i in range(3):
            V[i]+=row[i]*b
            for j in range(3): S[i][j]+=row[i]*row[j]
    a,b,c=solve3(S,V); return a,b,math.sqrt(c+a*a+b*b)
def pct(l,p):
    l=sorted(l); return l[min(len(l)-1,max(0,int(round(p/100*(len(l)-1)))))]
def run(path,label,y0,y1,d_nom):
    im=Image.open(path).convert('RGB'); px=im.load(); W,H=im.size; cx=W//2
    arc=[];orp=[]
    for y in range(y0,y1):
        for x in range(cx-130,cx+130):
            c=classe(px[x,y])
            if c in('teal','rouge'): arc.append((x,y))
            elif c=='or': orp.append((x,y))
    xa,ya,ra=fit(arc)
    dist=[math.hypot(x-xa,y-ya) for x,y in arc]
    sel=[(x,y) for x,y in orp if d_nom/2-14<math.hypot(x-xa,y-ya)<d_nom/2+6]
    xr,yr,rr=fit(sel); dr=[math.hypot(x-xr,y-yr) for x,y in sel]
    R_out=pct(dr,98); ep=pct(dr,98)-pct(dr,2)
    print(f"{label}: arc  centre=({xa:.1f},{ya:.1f}) r_ajuste={ra:.1f} radial p5..p95={pct(dist,5):.1f}..{pct(dist,95):.1f} (n={len(arc)})")
    print(f"      anneau centre=({xr:.1f},{yr:.1f}) r_ajuste={rr:.1f} radial p2..p98={pct(dr,2):.1f}..{R_out:.1f} (n={len(sel)})")
    print(f"      => R ext anneau {R_out:.1f} | arc median/R ext = {ra/R_out:.3f} | arc ext(p95)/R ext = {pct(dist,95)/R_out:.3f} | epaisseur anneau {ep:.1f}px = {ep/(2*R_out)*100:.1f} % du diametre")
    return ra/R_out, pct(dist,95)/R_out, ep/(2*R_out)
a=run(REF,'REF',30,190,194)
b=run(CAP,'JEU',20,170,184)
print(f"\narc median/R ext : ref {a[0]:.3f} jeu {b[0]:.3f} (jeu/ref {b[0]/a[0]:.3f}) | arc ext/R ext : ref {a[1]:.3f} jeu {b[1]:.3f} | anneau %diam : ref {a[2]*100:.1f} jeu {b[2]*100:.1f}")

# --- centre COMMUN (celui de l'anneau d'or) : rayons de l'arc mesures depuis ce centre
def commun(path,label,y0,y1,d_nom,xr,yr,Rext):
    im=Image.open(path).convert('RGB'); px=im.load(); cx=im.size[0]//2
    d=[math.hypot(x-xr,y-yr) for y in range(y0,y1) for x in range(cx-130,cx+130) if classe(px[x,y]) in('teal','rouge')]
    print(f"{label}: depuis le centre de l'anneau ({xr:.1f},{yr:.1f}) : arc p5..p50..p95 = {pct(d,5):.1f} / {pct(d,50):.1f} / {pct(d,95):.1f} ; /R ext : {pct(d,5)/Rext:.3f} / {pct(d,50)/Rext:.3f} / {pct(d,95)/Rext:.3f}")
commun(REF,'REF',30,190,194,539.3,121.7,96.9)
commun(CAP,'JEU',20,170,184,539.5,109.8,93.5)
