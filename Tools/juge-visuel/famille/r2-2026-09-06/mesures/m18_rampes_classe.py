# m18 — LA CLASSE, pas l'instance : les AUTRES rampes d'alpha de l'ecran passent-elles le meme test ?
#  (a) rail principal .arbre::before  linear-gradient(180deg, #b08d3e ff -> #b08d3e 33)
#  (b) voile radial de la tete        radial-gradient(75% 150% at 50% 0%, rgba(217,171,78,.06), transparent 62%)
# Meme protocole que m17 : alpha CONNU par la CSS, fond et couleur pleine MESURES sur chaque image.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def s2l(v):
    v/=255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def l2s(v):
    v=max(0.0,min(1.0,v))
    return 255.0*(12.92*v if v<=0.0031308 else 1.055*v**(1/2.4)-0.055)
# --- (a) rail principal : x CSS 31.5 (largeur 1.87). Bornes verticales : top -11.2 sous le haut de
#     .arbre, bottom 18.67 au-dessus du bas. On les MESURE au lieu de les deduire.
print('\n===== (a) RAIL PRINCIPAL (.arbre::before) — degrade d\'alpha 1.00 -> 0.20 sur sa hauteur =====')
for S in (R,C):
    im=S['im'].load()
    ys=[]
    for yc in [y/2 for y in range(2*230,2*940)]:
        p=P(S,32.0,yc)
        if p[1]>=S['im'].size[1]: break
        c=im[int(round(p[0])),int(round(p[1]))]
        if c[0]-c[2]>10 and c[0]>35: ys.append(yc)
    y0,y1=ys[0],ys[-1]
    print(f'  {S["nom"]}: rail y CSS {y0:.1f}..{y1:.1f} (hauteur {y1-y0:.1f})')
    fond=mediane(S,38,(y0+y1)/2-10,44,(y0+y1)/2+10)
    plein=None
    ligs=[]
    for t in (0.02,0.10,0.25,0.50,0.75,0.90,0.98):
        yc=y0+t*(y1-y0)
        vals=[im[int(round(P(S,32.0-0.5+k*0.5,yc)[0])),int(round(P(S,0,yc)[1]))] for k in range(4)]
        m=max(vals,key=lambda c:c[0])
        ligs.append((t,yc,m))
    plein=ligs[0][2]
    print(f'     fond lateral {fond} · couleur a t=0,02 (alpha~1,0) {plein}')
    tot_s=tot_l=0
    for t,yc,m in ligs:
        al=1.0-0.8*t
        ps=tuple(round(plein[i]*al+fond[i]*(1-al)) for i in range(3))
        pl=tuple(round(l2s(s2l(plein[i])*al+s2l(fond[i])*(1-al))) for i in range(3))
        ds=max(abs(m[i]-ps[i]) for i in range(3)); dl=max(abs(m[i]-pl[i]) for i in range(3))
        if t>0.05: tot_s+=ds; tot_l+=dl
        print(f'     t={t:.2f} alpha={al:.2f} mesure {str(m):>15} sRGB {str(ps):>15} d{ds:3d} | LIN {str(pl):>15} d{dl:3d}')
    print(f'     SOMME (t>0,05) : sRGB {tot_s} · LIN {tot_l}  => {"sRGB" if tot_s<tot_l else "LINEAIRE"}')
# --- (b) voile radial de la tete : exces sur le fond de feuille, au centre haut ---
print('\n===== (b) VOILE RADIAL DE LA TETE (rgba(217,171,78,.06) -> transparent a 62 %) =====')
for S in (R,C):
    ref=mediane(S,500,105,540,112) if S['nom']=='REF' else mediane(S,500,118,540,125)
    print(f'  {S["nom"]}: exces sur le fond de feuille (22,2x,2x), echantillons au centre haut :')
    for yc in (4,12,24,40,60,80):
        m=mediane(S,270,yc-2,300,yc+2)
        print(f'     y={yc:3d} {m}   (coin bas-droit du voile, temoin {ref})')
