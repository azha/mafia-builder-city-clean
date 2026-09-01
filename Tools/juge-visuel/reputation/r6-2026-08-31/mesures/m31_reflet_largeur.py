# m31 - largeur du reflet a mi-amplitude, profil fin. Amplitude = (somme RGB sur la ligne) - (somme 10px au-dessus).
# Normalise par le pic => insensible a la difference de luminosite.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",18,376,3.0,907),
       ("cap",S+"screen_b3_reputation_1080x1920.png",18,18,3.6,636)]
for k,f,ox,oy,sc,yl in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); W=im.size[0]
    print(f"== {k} size={im.size} ligne y={yl}")
    amp=[]
    for x in range(0,W):
        a=sum(px[x,yl]); b=sum(px[x,yl-10])
        amp.append((x,max(0,a-b)))
    pk=max(a for _,a in amp)
    half=[x for x,a in amp if a>=0.5*pk]
    q=[x for x,a in amp if a>=0.25*pk]
    print(f"  pic amplitude={pk}")
    print(f"  50% du pic : x {(min(half)-ox)/sc:.1f}..{(max(half)-ox)/sc:.1f} CSS  largeur={(max(half)-min(half)+1)/sc:.1f} CSS  centre={((min(half)+max(half))/2-ox)/sc:.1f}")
    print(f"  25% du pic : x {(min(q)-ox)/sc:.1f}..{(max(q)-ox)/sc:.1f} CSS  largeur={(max(q)-min(q)+1)/sc:.1f} CSS")
