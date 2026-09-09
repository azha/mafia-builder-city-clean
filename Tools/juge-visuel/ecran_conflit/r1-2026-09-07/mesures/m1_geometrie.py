# m1 — geometrie verticale : profil de luminance par ligne, frontieres.
# Controle positif : la largeur des deux images doit etre 1080 (imprime).
# Controle negatif : la hauteur doit differer (2102 vs 2400).
from PIL import Image

def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def profil(path, x0=0, x1=None):
    im = Image.open(path).convert('RGB')
    W,H = im.size
    print(f"{path} -> {W}x{H}")
    if x1 is None: x1 = W
    px = im.load()
    out=[]
    step = max(1,(x1-x0)//180)
    for y in range(H):
        s=0.0; n=0
        for x in range(x0,x1,step):
            s+=lum(px[x,y]); n+=1
        out.append(s/n)
    return im,out

for path in ['reference-1080x2102.png','capture-1080x2400.png']:
    im,pr = profil(path)
    print("  --- sauts de luminance moyenne (|delta|>4) ---")
    prev=pr[0]
    for y in range(1,len(pr)):
        d=pr[y]-prev
        if abs(d)>4:
            print(f"   y={y:5d}  {prev:7.2f} -> {pr[y]:7.2f}  delta {d:+7.2f}")
        prev=pr[y]
    print()
