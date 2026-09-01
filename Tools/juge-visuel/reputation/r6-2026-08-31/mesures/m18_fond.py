# m18 - le fond de l'ecran : profil vertical de couleur dans la marge gauche (x = 8 px CSS) et
# sous le cadre. Controle positif : la marge du cadre au niveau des tuiles (attendue EGALE).
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
def med(im,x0,y0,x1,y1):
    px=im.load(); v=[px[x,y] for x in range(x0,x1) for y in range(y0,y1)]
    return tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3))
ir=Image.open(D+"reference/m-120.png").convert("RGB")
i19=Image.open(S+"screen_b3_reputation_1080x1920.png").convert("RGB")
i24=Image.open(S+"screen_b3_reputation_1080x2400.png").convert("RGB")
print("ref",ir.size,"1920",i19.size,"2400",i24.size)
print("REF  marge gauche entre cadre et bord (x 6..15) :")
for y in (400,700,1000,1300,1600,1740): print("   y",y,"CSS",round((y-376)/3,1),med(ir,5,y-6,15,y+6))
print("CAP1920 marge gauche (x 6..15) :")
for y in (60,300,700,1100,1500,1630): print("   y",y,"CSS",round((y-18)/3.6,1),med(i19,5,y-6,15,y+6))
print("CAP1920 sous le cadre (bande pleine largeur) :")
for y in (1680,1750,1820,1890): print("   y",y,med(i19,40,y-6,1040,y+6))
print("CAP2400 sous le cadre :")
for y in (1680,1800,2000,2200,2380): print("   y",y,med(i24,40,y-6,1040,y+6))
print("REF fond au-dessus du cadre (zone chrome) :")
for y in (200,300,360): print("   y",y,med(ir,300,y-6,600,y+6))
