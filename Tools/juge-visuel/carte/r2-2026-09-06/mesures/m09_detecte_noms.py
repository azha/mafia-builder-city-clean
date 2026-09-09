# m09 — DETECTION des noms de quartier dans les deux images, par seuil de luminance + composantes connexes.
# Convention d'angle : 0 deg = horizontale de l'image ; positif = HORAIRE a l'ecran
#   (y croit vers le bas ; un mot dont la FIN est plus BASSE que le debut a un angle POSITIF).
#   C'est la convention du dossier (rotate(theta cx cy) SVG).
# Controle positif : on doit retrouver 18 mots de chaque cote (compte connu, ecrit au dossier).
# Controle negatif : "LE THRENNY" (peint DANS la texture) doit sortir des DEUX cotes avec la meme geometrie.
from PIL import Image
import os, math, json
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(D, "mesures")

def composantes(path, y0, y1, seuil, name):
    im = Image.open(os.path.join(D, path)).convert("RGB")
    print(f"OUVERT {name}: {im.size}  (bande y {y0}..{y1}, seuil L>{seuil})")
    px = im.load(); W, H = im.size
    mask = [[False]*W for _ in range(y1-y0+1)]
    for y in range(y0, y1+1):
        r = mask[y-y0]
        for x in range(W):
            R,G,B = px[x,y]
            L = 0.2126*R+0.7152*G+0.0722*B
            # creme : clair ET peu bleute ET pas trop sature vers le jaune pur (les points d'or sont r-b>110)
            if L > seuil and (R-B) < 90 and B > 60:
                r[x] = True
    # composantes 8-connexes, iteratives
    comps = []
    seen = [[False]*W for _ in range(y1-y0+1)]
    for j in range(y1-y0+1):
        for i in range(W):
            if mask[j][i] and not seen[j][i]:
                stack=[(i,j)]; seen[j][i]=True; pts=[]
                while stack:
                    a,b = stack.pop(); pts.append((a,b))
                    for db in (-1,0,1):
                        for da in (-1,0,1):
                            na,nb = a+da, b+db
                            if 0<=na<W and 0<=nb<=y1-y0 and mask[nb][na] and not seen[nb][na]:
                                seen[nb][na]=True; stack.append((na,nb))
                if len(pts) >= 6:
                    comps.append([(a, b+y0) for a,b in pts])
    return im, comps

def grouper(comps, gap_x=26, gap_y=22):
    # regroupe les lettres en MOTS : boites qui se recouvrent en y et sont proches en x
    boxes = []
    for c in comps:
        xs=[p[0] for p in c]; ys=[p[1] for p in c]
        boxes.append([min(xs),min(ys),max(xs),max(ys),c])
    boxes.sort(key=lambda b:(b[0]))
    used=[False]*len(boxes); mots=[]
    for i,b in enumerate(boxes):
        if used[i]: continue
        used[i]=True; grp=[b]
        chg=True
        while chg:
            chg=False
            gx0=min(g[0] for g in grp); gy0=min(g[1] for g in grp)
            gx1=max(g[2] for g in grp); gy1=max(g[3] for g in grp)
            for j,c in enumerate(boxes):
                if used[j]: continue
                if c[0] <= gx1+gap_x and c[2] >= gx0-gap_x and c[1] <= gy1+gap_y and c[3] >= gy0-gap_y:
                    used[j]=True; grp.append(c); chg=True
        pts=[p for g in grp for p in g[4]]
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        mots.append({"x0":min(xs),"y0":min(ys),"x1":max(xs),"y1":max(ys),"n":len(pts),"pts":pts,"nlet":len(grp)})
    return [m for m in mots if m["x1"]-m["x0"] >= 30 and m["n"] >= 120]

def angle(mot, nslices=None):
    # regression de la position mediane d'encre par tranche verticale
    xs = {}
    for x,y in mot["pts"]: xs.setdefault(x,[]).append(y)
    cols = sorted(xs)
    if len(cols) < 20: return None
    pts=[]
    for x in cols:
        v=sorted(xs[x]); pts.append((x, v[len(v)//2]))
    n=len(pts); mx=sum(p[0] for p in pts)/n; my=sum(p[1] for p in pts)/n
    sxy=sum((p[0]-mx)*(p[1]-my) for p in pts); sxx=sum((p[0]-mx)**2 for p in pts)
    if sxx==0: return None
    a = sxy/sxx
    return math.degrees(math.atan(a))   # positif = y croit vers la droite = HORAIRE

def hauteur_capitale(mot):
    # hauteur d'encre par tranche de 12 px, mediane des tranches (insensible a l'inclinaison)
    xs = {}
    for x,y in mot["pts"]: xs.setdefault(x,[]).append(y)
    cols=sorted(xs); hs=[]
    for i in range(0, len(cols)-11, 6):
        sl=[y for x in cols[i:i+12] for y in xs[x]]
        if len(sl) < 20: continue
        hs.append(max(sl)-min(sl)+1)
    hs.sort()
    return hs[len(hs)//2] if hs else None

res = {}
for path, name, y0, y1, seuil in (
        ("reference-1080x2102.png","REF", 219, 2084, 120),
        ("capture-1080x2400.png","CAP", 232, 2135, 120)):
    im, comps = composantes(path, y0, y1, seuil, name)
    mots = grouper(comps)
    mots.sort(key=lambda m:(m["y0"], m["x0"]))
    print(f"  {name}: {len(comps)} composantes -> {len(mots)} mots retenus")
    out=[]
    for m in mots:
        a = angle(m); h = hauteur_capitale(m)
        out.append({"x0":m["x0"],"y0":m["y0"],"x1":m["x1"],"y1":m["y1"],"n":m["n"],
                    "cx":(m["x0"]+m["x1"])/2,"cy":(m["y0"]+m["y1"])/2,
                    "ang":a,"hcap":h,"nlet":m["nlet"]})
        print(f"    ({m['x0']:4d},{m['y0']:4d})-({m['x1']:4d},{m['y1']:4d}) w={m['x1']-m['x0']+1:4d} h={m['y1']-m['y0']+1:3d} n={m['n']:5d} lettres~{m['nlet']:2d} ang={a if a is None else round(a,2)} hcap={h}")
    res[name]=out
json.dump(res, open(os.path.join(M,"noms_detectes.json"),"w"), indent=1)
print("\necrit mesures/noms_detectes.json")
