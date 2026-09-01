# m23 - voyants des 4 rangees + pas vertical des rangees (centroide sous-pixel des bordures).
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
def bord(p):
    r,g,b=p; return abs(r-42)<16 and abs(g-53)<18 and abs(b-72)<20
CASES=[("ref",D+"reference/m-120.png",18,376,3.0,(470,850),(838,1210)),
       ("cap",S+"screen_b3_reputation_1080x1920.png",18,18,3.6,(545,1005),(530,950))]
for k,f,ox,oy,sc,(xa,xb),(ya,yb) in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); print(f"== {k} size={im.size}")
    # bordures horizontales des rangees : centroide pondere sur chaque bande
    prof=[]
    for y in range(ya,yb):
        c=sum(1 for x in range(xa+10,xb-10) if bord(px[x,y]))
        prof.append((y,c))
    thr=0.5*max(c for _,c in prof)
    grp=[];cur=[]
    for y,c in prof:
        if c>thr: cur.append((y,c))
        else:
            if cur: grp.append(cur); cur=[]
    if cur: grp.append(cur)
    cents=[sum(y*c for y,c in g)/sum(c for _,c in g) for g in grp]
    print("  bordures (CSS):", [round((c-oy)/sc,2) for c in cents])
    if len(cents)>=8:
        tops=[cents[i] for i in range(0,8,2)]; bots=[cents[i] for i in range(1,8,2)]
        print("  hauteurs de rangee (CSS):",[round((bots[i]-tops[i])/sc,2) for i in range(4)])
        print("  pas (top->top) (CSS):",[round((tops[i+1]-tops[i])/sc,2) for i in range(3)])
        print("  gouttieres (CSS):",[round((tops[i+1]-bots[i])/sc,2) for i in range(3)])
    # voyants : disques dans la colonne de gauche de la rangee
    for i,g in enumerate(zip(grp[0::2],grp[1::2]),1):
        y0=int(g[0][0][0]); y1=int(g[1][-1][0])
        pts=[(x,y) for y in range(y0+3,y1-2) for x in range(xa,xa+int(28*sc))
             if 45<max(px[x,y])<115 and px[x,y][2]>px[x,y][0]+12]
        if not pts: print(f"   voyant r{i}: rien"); continue
        ax=min(p[0] for p in pts);bx=max(p[0] for p in pts);ay=min(p[1] for p in pts);by=max(p[1] for p in pts)
        print(f"   voyant r{i}: CSS {(bx-ax+1)/sc:.1f}x{(by-ay+1)/sc:.1f} centre x={((ax+bx)/2-ox)/sc:.1f} "
              f"y_rel_rangee={((ay+by)/2-y0)/(y1-y0)*100:.0f}% aire/bbox={len(pts)/((bx-ax+1)*(by-ay+1)):.2f}")
