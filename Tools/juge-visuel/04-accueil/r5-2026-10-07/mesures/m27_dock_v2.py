# m27 — dock v2 : bbox reelle de chaque rond (balayage 2D), libelles (bande, largeur, couleur),
# soulignement de l'onglet actif, pastille FAMILLE.
# Controle positif : les 4 pas entre centres doivent etre egaux a ~1 px pres.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
ZONE={'REF':(1870,2060),'JEU1920':(1680,1870),'JEU2400':(2160,2350)}
def dock(im,nom):
    px=im.load(); w,h=im.size; y0,y1=ZONE[nom]; y1=min(y1,h)
    base=med([lum(px[x,y]) for y in range(y0,y1) for x in range(0,w,3)])
    # ronds : pixels dont la luminance depasse le fond de >5 ET non chauds
    pts=[(x,y) for y in range(y0,y1) for x in range(150,920)
         if lum(px[x,y])-base>5 and px[x,y][0]-px[x,y][2]<25]
    cols={}
    for x,y in pts: cols.setdefault(x,[]).append(y)
    xs=sorted(cols)
    grp=[];cur=[xs[0]]
    for x in xs[1:]:
        if x-cur[-1]<=8: cur.append(x)
        else: grp.append(cur); cur=[x]
    grp.append(cur)
    print(f'  --- {nom} (fond lum {base:.1f}) ---')
    cent=[]
    for g in grp:
        if len(g)<30: continue
        ys=[y for x in g for y in cols[x]]
        # le rond : on borne en y au 1er bloc continu
        print(f'    objet x {g[0]}..{g[-1]} (l={g[-1]-g[0]+1})  y {min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1})  centre x={(g[0]+g[-1])/2:.1f}')
        cent.append((g[0]+g[-1])/2)
    if len(cent)>=4:
        print('    pas entre centres :', [round(cent[i+1]-cent[i],1) for i in range(len(cent)-1)])
    # libelles : bande d'encre sous les ronds
    for xa,xb,lib in [(180,340,'EMPIRE'),(370,525,'FAMILLE'),(555,715,'FILIERE'),(745,900,'PLUS')]:
        b2=med([lum(px[x,y]) for y in range(y1-90,y1) for x in range(xa,xb)])
        pp=[(x,y) for y in range(y1-95,y1) for x in range(xa,xb) if lum(px[x,y])-b2>22]
        if not pp: print(f'    {lib}: pas d encre'); continue
        xsp=[p[0] for p in pp]; ysp=[p[1] for p in pp]
        top=sorted(pp,key=lambda q:lum(px[q[0],q[1]]),reverse=True)[:40]
        col=tuple(med([px[q[0],q[1]][k] for q in top]) for k in range(3))
        print(f'    {lib}: x {min(xsp)}..{max(xsp)} l={max(xsp)-min(xsp)+1}  y {min(ysp)}..{max(ysp)} h={max(ysp)-min(ysp)+1}  couleur {col}')
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: dock(charge(p),n)
