# m01 — repères horizontaux : le filet laiton sous la barre, et les frontières de bandes unies.
# Contrôle positif : la largeur des images est celle annoncée par le dossier.
# Contrôle négatif : une ligne prise dans l'art (y=50%) NE doit PAS être classée "unie".
from PIL import Image

FILES = {
 'canon'   : ('../ecran-canon.png', 3.0),
 'district': ('../capture-district-1080x2400.png', 2.755),
 'fiche19' : ('../capture-fiche-1080x1920.png', 2.755),
 'fiche24' : ('../capture-fiche-1080x2400.png', 2.755),
}

def med(vals):
    v=sorted(vals); n=len(v)
    return v[n//2] if n%2 else (v[n//2-1]+v[n//2])/2

def row_stats(px, w, y, x0=None, x1=None):
    x0 = 0 if x0 is None else x0
    x1 = w if x1 is None else x1
    R=[];G=[];B=[]
    for x in range(x0,x1):
        r,g,b = px[x,y][:3]; R.append(r);G.append(g);B.append(b)
    mr,mg,mb = med(R),med(G),med(B)
    # dispersion : max écart au médian
    disp = max(max(abs(c-mr) for c in R), max(abs(c-mg) for c in G), max(abs(c-mb) for c in B))
    return (mr,mg,mb,disp)

for name,(f,fac) in FILES.items():
    im = Image.open(f).convert('RGB'); w,h = im.size; px = im.load()
    print(f'== {name}  {f}  taille={w}x{h}  facteur={fac}')
    # goldness = r-b, cherché sur la bande centrale (évite les bords)
    best=[]
    for y in range(0, min(h, int(90*fac))):
        mr,mg,mb,disp = row_stats(px,w,y,int(w*0.25),int(w*0.75))
        best.append((mr-mb, y, mr,mg,mb,disp))
    best.sort(reverse=True)
    print('   5 rangées les plus "laiton" (r-b) dans les 90 premiers px CSS :')
    for d,y,mr,mg,mb,disp in best[:5]:
        print(f'     y={y:4d} ({y/fac:6.2f} CSS)  rgb=({mr},{mg},{mb})  r-b={d}  disp={disp}')
    # contrôle négatif : ligne à mi-hauteur
    mr,mg,mb,disp = row_stats(px,w,h//2,0,w)
    print(f'   [ctrl neg] y={h//2} (mi-hauteur, art) rgb=({mr},{mg},{mb}) dispersion={disp}  -> uni? {disp<=6}')
