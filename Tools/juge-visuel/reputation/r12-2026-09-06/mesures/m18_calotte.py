import sys; sys.path.insert(0,'.')
from lib import *
print("=== m18 : calotte (coiffe) vs visage — profils de largeur, epaisseur laterale, attache ===")
def proche(c, ref, tol=6):
    return all(abs(c[i]-ref[i])<=tol for i in range(3))
CAS = [
 ('REF','../reference-1080x2102.png', (85,880),(22,25,27),(11,16,22), 1000,1290),
 ('JEU','../capture-1080x2400.png',   (81,908),(22,22,28),(13,14,23), 1020,1320),
]
def peau(c):
    r,g,b=c; return 150<r<215 and 140<g<205 and 110<b<175 and r>g>b
res={}
for nom,f,(ox,oy),fill,outl,y0,y1 in CAS:
    im=ouvrir(f); p=px(im)
    X0,X1 = ox+60, ox+360
    prof_p=[]; prof_c=[]
    for y in range(y0,y1):
        xs=[x for x in range(X0,X1) if peau(p[x,y])]
        cs=[x for x in range(X0,X1) if proche(p[x,y],fill) or proche(p[x,y],outl)]
        prof_p.append((y, (min(xs),max(xs),max(xs)-min(xs)+1) if xs else None))
        prof_c.append((y, (min(cs),max(cs),max(cs)-min(cs)+1) if cs else None))
    # visage : lignes ou la peau est large (> 40 px) et contigue
    vis=[(y,t) for y,t in prof_p if t and t[2]>40]
    ytop=vis[0][0]; 
    # bas du visage = derniere ligne large avant retrecissement (le cou)
    larg=[t[2] for _,t in vis]
    mx=max(larg)
    ybot=max(y for y,t in vis if t[2] > 0.55*mx)
    print(f"  {nom} VISAGE : y {ytop}..{ybot} (h={ybot-ytop+1}), largeur max = {mx} px a y={[y for y,t in vis if t[2]==mx][0]}")
    # calotte : lignes ou la coiffe existe
    cal=[(y,t) for y,t in prof_c if t and t[2]>20]
    if cal:
        ct=cal[0][0]; cb=cal[-1][0]
        cmax=max(t[2] for _,t in cal)
        print(f"  {nom} CALOTTE: sommet y={ct}, largeur max = {cmax} px (rapport calotte/visage = {cmax/mx:.3f})")
    # epaisseur laterale a 15 % / 30 % / 50 % de la hauteur du visage
    h=ybot-ytop+1
    for frac in (0.15,0.30,0.50):
        y=int(ytop+frac*h)
        tp=dict(prof_p)[y]; tc=dict(prof_c)[y]
        if tp and tc:
            gauche = tp[0]-tc[0]; droite = tc[1]-tp[1]
            print(f"     a {int(frac*100):2d} % de la hauteur du visage (y={y}) : peau x{tp[0]}..{tp[1]} | coiffe x{tc[0]}..{tc[1]}"
                  f"  -> epaisseur laterale gauche={gauche} px droite={droite} px")
        elif tp:
            print(f"     a {int(frac*100):2d} % (y={y}) : peau x{tp[0]}..{tp[1]} | AUCUNE coiffe laterale")
    # attache : plus bas y ou la coiffe existe HORS de la peau
    bas=None
    for y,tc in prof_c:
        tp=dict(prof_p).get(y)
        if tc and tp and (tp[0]-tc[0]>2 or tc[1]-tp[1]>2): bas=y
    if bas: print(f"     coiffe presente lateralement jusqu'a y={bas}  (soit {100*(bas-ytop)/h:.0f} % de la hauteur du visage)")
    # pincement du sommet : largeur de la calotte a 3 hauteurs proches du sommet
    if cal:
        ct=cal[0][0]
        for d in (4,8,12,16,24,32):
            t=dict(prof_c).get(ct+d)
            if t: print(f"     largeur de la coiffe a {d:2d} px du sommet = {t[2]} px")
    res[nom]=(ytop,ybot,mx)
    print()
