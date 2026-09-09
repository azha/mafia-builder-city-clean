# r10-m02 : palette quantifiee de la ZONE DE CADRE (ref vs capture 2400), couverture en %.
# Controle positif : la somme des % de chaque cote vaut 100.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
CADRE={"reference-1080x2102.png":(21,452,1059,2079),
       "capture-1080x2400.png":(18,18,1062,1645)}
for f,(x0,y0,x1,y1) in CADRE.items():
    im=Image.open(D+f).convert("RGB")
    print(f"{f} taille={im.size}  cadre=({x0},{y0})-({x1},{y1})  {x1-x0}x{y1-y0}")
    c=im.crop((x0,y0,x1,y1))
    q=c.quantize(colors=14, method=Image.MEDIANCUT).convert("RGB")
    cols=q.getcolors(1000000); cols.sort(reverse=True)
    tot=sum(n for n,_ in cols)
    s=0
    for n,rgb in cols[:14]:
        print(f"   {rgb}  {100*n/tot:6.2f} %")
        s+=100*n/tot
    print(f"   somme = {s:.2f} %  (controle positif : 100)")
    print()
