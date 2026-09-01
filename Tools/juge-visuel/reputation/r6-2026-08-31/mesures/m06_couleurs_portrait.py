# m06 - couleurs du portrait: palette quantifiee de la zone figure (sous le titre, au-dessus du verdict)
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
# zone figure = carte, de 20% a 88% de la hauteur (evite les 2 blocs de texte)
CASES=[("ref_m120",D+"reference/m-120.png",69,732,422,1279),
       ("cap1920",S+"screen_b3_reputation_1080x1920.png",72,435,496,1061)]
for k,f,x0,y0,x1,y1 in CASES:
    im=Image.open(f).convert("RGB"); print(f"== {k} size={im.size}")
    H=y1-y0
    c=im.crop((x0+3,y0+int(0.20*H),x1-2,y0+int(0.88*H)))
    print("  zone figure",c.size)
    q=c.quantize(colors=10,method=Image.MEDIANCUT).convert("RGB")
    cols=sorted(q.getcolors(1<<20),reverse=True); tot=sum(n for n,_ in cols)
    for n,rgb in cols: print(f"   {rgb}  {100*n/tot:5.2f}%")
