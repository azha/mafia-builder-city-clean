# m01 : rect du CONTENU (entre bandeau et dock) mesure sur l'IMAGE, colonne de bord
# gauche (x=6) ou aucun contenu d'ecran ne vit. Controle positif : le bandeau du
# HUD doit faire 143 px (52 CSS-HUD x 2.755) sur la capture -> on l'imprime.
from PIL import Image
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for path,cols in [('reference-1080x2102.png',[6,20,540]),('capture-1080x2400.png',[6,20,540])]:
    im=Image.open(path).convert('RGB'); print(f"ouvert {path} -> {im.size}")
    px=im.load(); w,h=im.size
    for c in cols:
        print(f"  colonne x={c}")
        prev=None
        for y in range(0,h):
            v=px[c,y]
            if prev is None or max(abs(v[i]-prev[i]) for i in range(3))>10:
                print(f"    y={y:5d} rgb={v}")
                prev=v
        print()
