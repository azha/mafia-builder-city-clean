# m13 : bande du bas. CAPTURE = puce "Chaleur : affichee" + 4 pastilles de legende.
# REFERENCE = ligne d'aide italique serif sur voile. On mesure : rect, couleurs,
# hauteur de capitale, contraste. Controle positif : la couleur de la puce de legende
# doit etre la MEME que celle des 18 plaques (140,140,148) si c'est le meme jeton.
from PIL import Image
import statistics
cap=Image.open('capture-1080x2400.png').convert('RGB'); cp=cap.load()
ref=Image.open('reference-1080x2102.png').convert('RGB'); rp=ref.load()
print(f"ouvert cap -> {cap.size} ; ref -> {ref.size}")
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def rl(p):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def K(a,b):
    la,lb=rl(a),rl(b); return (max(la,lb)+0.05)/(min(la,lb)+0.05)

# --- puce "Chaleur : affichee"
print("\n[CAP] puce de legende : bbox du gris (110<r<175, |r-g|<10)")
xs=[];ys=[]
for y in range(2090,2150):
    for x in range(0,300):
        p=cp[x,y]
        if 110<p[0]<175 and abs(p[0]-p[1])<10 and 0<=p[2]-p[0]<26: xs.append(x); ys.append(y)
print(f"  bbox=({min(xs)},{min(ys)},{max(xs)},{max(ys)}) soit {max(xs)-min(xs)+1}x{max(ys)-min(ys)+1} px")
med=tuple(int(statistics.median([cp[x,y][k] for x,y in zip(xs,ys)])) for k in range(3))
print(f"  couleur mediane = {med}   (plaques de nom = (140,140,148))  -> IDENTIQUE : {med==(140,140,148)}")

# --- pastilles de couleur de la legende
print("\n[CAP] pastilles de la legende (y ~2112..2130), balayage x 190..500")
prev=None
for x in range(190,500):
    p=cp[x,2121]
    if prev is None or max(abs(p[i]-prev[i]) for i in range(3))>25:
        print(f"   x={x:4d} {p}")
        prev=p

# --- hauteur de capitale des libelles de legende
def hauteur(px,x0,y0,x1,y1,seuil):
    ys=[y for y in range(y0,y1) for x in range(x0,x1) if L(px[x,y])>=seuil]
    return (min(ys),max(ys),max(ys)-min(ys)+1) if ys else None
print("\n[CAP] hauteur d'encre 'Chaleur : affichee' (blanc sur puce) :", hauteur(cp,40,2100,180,2140,190))
print("[CAP] hauteur d'encre 'Libre' :", hauteur(cp,222,2105,262,2138,150))

# --- ligne d'aide de la reference
print("\n[REF] ligne d'aide : encre creme, bbox et hauteur")
xs=[];ys=[]
for y in range(1955,2060):
    for x in range(60,1020):
        p=rp[x,y]
        if L(p)>=120 and p[0]>p[2]: xs.append(x); ys.append(y)
print(f"  bbox=({min(xs)},{min(ys)},{max(xs)},{max(ys)}) soit {max(xs)-min(xs)+1}x{max(ys)-min(ys)+1} px, {len(xs)} px d'encre")
mede=tuple(int(statistics.median([rp[x,y][k] for x,y in zip(xs,ys)])) for k in range(3))
fond=[rp[x,y] for y in range(2000,2015) for x in range(120,180)]
medf=tuple(int(statistics.median([q[k] for q in fond])) for k in range(3))
print(f"  encre mediane={mede}  fond={medf}  contraste={K(mede,medf):.2f}:1")
