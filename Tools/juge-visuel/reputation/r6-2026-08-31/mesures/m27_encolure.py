# m27 - profil du bord SUPERIEUR du buste (encolure) : y du premier pixel "etoffe" par colonne.
# Dans la maquette, l'encolure descend en V jusqu'a la pointe du col. Meme critere des deux cotes.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",69,732,422,1279,3.0),
       ("cap",S+"screen_b3_reputation_1080x1920.png",72,435,496,1061,3.6)]
def etoffe(p):
    r,g,b=p; return max(p)<70 and (b-r)<12
for k,f,x0,y0,x1,y1,sc in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); Wc=x1-x0;Hc=y1-y0
    print(f"== {k} size={im.size}")
    print("   x%carte : y%carte du haut du buste")
    row=[]
    for xp in range(20,81,4):
        x=x0+int(xp/100*Wc)
        ys=[y for y in range(y0+int(0.55*Hc),y0+int(0.90*Hc)) if etoffe(px[x,y])]
        row.append((xp, round((ys[0]-y0)/Hc*100,1) if ys else None))
    print("   ",row)
