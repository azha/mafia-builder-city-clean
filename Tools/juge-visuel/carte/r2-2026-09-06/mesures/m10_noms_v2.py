# m10 — DETECTION v2 : encre CREME CHAUDE uniquement (R-B dans [12,90]), lettres filtrees par taille,
#        regroupement en mots serre. Corrige le sur-groupement du m09 (chaines par les tours blanches).
# CONVENTION D'ANGLE : 0 deg = horizontale de l'image ; POSITIF = HORAIRE a l'ecran
#   (y croit vers le bas => un mot dont la fin est plus BASSE que le debut a un angle POSITIF).
# CONTROLE POSITIF : 18 mots attendus de chaque cote (compte connu).
# CONTROLE NEGATIF : les tours blanches (R<B) et les points d'or (R-B>110) ne doivent pas passer le filtre.
from PIL import Image
import os, math, json
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(D, "mesures")

def encre(px, x, y):
    R,G,B = px[x,y]
    L = 0.2126*R+0.7152*G+0.0722*B
    return L > 110 and 10 <= (R-B) <= 95 and G > 100

def lettres(path, y0, y1, name):
    im = Image.open(os.path.join(D, path)).convert("RGB")
    print(f"OUVERT {name}: {im.size}")
    px = im.load(); W,H = im.size
    mask=[[False]*W for _ in range(y1-y0+1)]
    for y in range(y0,y1+1):
        r=mask[y-y0]
        for x in range(W):
            if encre(px,x,y): r[x]=True
    seen=[[False]*W for _ in range(y1-y0+1)]
    out=[]
    for j in range(y1-y0+1):
        for i in range(W):
            if mask[j][i] and not seen[j][i]:
                st=[(i,j)]; seen[j][i]=True; pts=[]
                while st:
                    a,b=st.pop(); pts.append((a,b))
                    for db in(-1,0,1):
                        for da in(-1,0,1):
                            na,nb=a+da,b+db
                            if 0<=na<W and 0<=nb<=y1-y0 and mask[nb][na] and not seen[nb][na]:
                                seen[nb][na]=True; st.append((na,nb))
                xs=[p[0] for p in pts]; ys=[p[1]+y0 for p in pts]
                w=max(xs)-min(xs)+1; h=max(ys)-min(ys)+1
                if 5 <= len(pts) <= 900 and 5 <= h <= 32 and 2 <= w <= 46:
                    out.append((min(xs),min(ys),max(xs),max(ys),[(a,b+y0) for a,b in pts]))
    print(f"  {name}: {len(out)} composantes de taille de LETTRE")
    return im, out

def mots(lets, gx, gy):
    lets = sorted(lets, key=lambda b:b[0])
    used=[False]*len(lets); res=[]
    for i,b in enumerate(lets):
        if used[i]: continue
        used[i]=True; grp=[b]; chg=True
        while chg:
            chg=False
            gx0=min(g[0] for g in grp); gy0=min(g[1] for g in grp)
            gx1=max(g[2] for g in grp); gy1=max(g[3] for g in grp)
            for j,c in enumerate(lets):
                if used[j]: continue
                if c[0]<=gx1+gx and c[2]>=gx0-gx and c[1]<=gy1+gy and c[3]>=gy0-gy:
                    used[j]=True; grp.append(c); chg=True
        pts=[p for g in grp for p in g[4]]
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        res.append({"x0":min(xs),"y0":min(ys),"x1":max(xs),"y1":max(ys),"n":len(pts),"nlet":len(grp),"pts":pts})
    return res

def ang_h(m):
    cols={}
    for x,y in m["pts"]: cols.setdefault(x,[]).append(y)
    ks=sorted(cols)
    if len(ks)<25: return None,None
    P=[(x,sorted(cols[x])[len(cols[x])//2]) for x in ks]
    n=len(P); mx=sum(p[0] for p in P)/n; my=sum(p[1] for p in P)/n
    sxy=sum((p[0]-mx)*(p[1]-my) for p in P); sxx=sum((p[0]-mx)**2 for p in P)
    a=sxy/sxx if sxx else 0
    hs=[]
    for i in range(0,len(ks)-9,5):
        sl=[y for x in ks[i:i+10] for y in cols[x]]
        if len(sl)>=18: hs.append(max(sl)-min(sl)+1)
    hs.sort()
    return math.degrees(math.atan(a)), (hs[len(hs)//2] if hs else None)

res={}
for path,name,y0,y1,gx,gy in (("reference-1080x2102.png","REF",219,2084,17,9),
                              ("capture-1080x2400.png","CAP",232,2135,15,9)):
    im, L = lettres(path,y0,y1,name)
    W = [w for w in mots(L,gx,gy) if w["nlet"]>=4 and (w["x1"]-w["x0"])>=40 and w["n"]>=150]
    W.sort(key=lambda m:(m["y0"],m["x0"]))
    print(f"  {name}: {len(W)} MOTS")
    o=[]
    for m in W:
        a,h = ang_h(m)
        o.append({"x0":m["x0"],"y0":m["y0"],"x1":m["x1"],"y1":m["y1"],"n":m["n"],"nlet":m["nlet"],
                  "cx":(m["x0"]+m["x1"])/2.0,"cy":(m["y0"]+m["y1"])/2.0,"ang":a,"hcap":h})
        print(f"    ({m['x0']:4d},{m['y0']:4d})-({m['x1']:4d},{m['y1']:4d}) w={m['x1']-m['x0']+1:4d} n={m['n']:5d} let={m['nlet']:2d} ang={None if a is None else round(a,2):>7} hcap={h}")
    res[name]=o
json.dump(res, open(os.path.join(M,"noms_v2.json"),"w"), indent=1)
print("ecrit mesures/noms_v2.json")
