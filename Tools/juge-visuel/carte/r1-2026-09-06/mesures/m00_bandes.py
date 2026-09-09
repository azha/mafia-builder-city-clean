# m00 : trouver les grandes frontieres horizontales (bandeau, contenu, dock) par
# luminance moyenne de ligne + derivee. Controle positif : la largeur des deux
# images est 1080 (imprimee).
from PIL import Image
import statistics as st

def lum(px):
    r,g,b = px[0],px[1],px[2]
    return 0.2126*r + 0.7152*g + 0.0722*b

def profil(path):
    im = Image.open(path).convert('RGB')
    print(f"  ouvert {path} -> {im.size}")
    w,h = im.size
    px = im.load()
    out = []
    for y in range(h):
        vals = [lum(px[x,y]) for x in range(0,w,7)]
        out.append(sum(vals)/len(vals))
    return im, out

for p in ['reference-1080x2102.png','capture-1080x2400.png']:
    im, prof = profil(p)
    w,h = im.size
    print(f"--- {p}  {w}x{h}")
    # derivee
    d = [abs(prof[y+1]-prof[y]) for y in range(len(prof)-1)]
    top = sorted(range(len(d)), key=lambda i:-d[i])[:40]
    top.sort()
    # regrouper
    groups=[]
    for y in top:
        if groups and y-groups[-1][-1] <= 3: groups[-1].append(y)
        else: groups.append([y])
    for g in groups:
        y = g[len(g)//2]
        print(f"   frontiere y={y:5d}  lum {prof[y]:6.1f} -> {prof[min(y+2,h-1)]:6.1f}  (saut {d[y]:5.1f})")
