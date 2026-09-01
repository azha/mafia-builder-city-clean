# m19 - la lueur cyan du bas (chassis6: radial-gradient(90% 60% at 50% 96%, rgba(127,212,217,.07)))
# Compare le PIXEL RESULTANT sur le fond, au meme point du corps (en % de la hauteur du corps).
# ref: corps = 584px CSS (122 chrome + 462 cadre) ; cap 1920: corps = 533.3 CSS ; cap 2400: 666.7 CSS
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
print("REF, bande visible sous le cadre (y 1735..1750, soit 99% du corps), x=centre :",med(ir,300,1735,600,1750))
print("REF, meme bande, x=marge gauche                                    :",med(ir,3,1735,16,1750))
print("CAP1920, y 99% du corps = 1901..1916, x=centre                     :",med(i19,300,1901,600,1916))
print("CAP1920, meme bande, x=marge gauche                                :",med(i19,3,1901,16,1916))
print("CAP2400, y 99% du corps = 2376..2391, x=centre                     :",med(i24,300,2376,600,2391))
print()
print("Prediction du melange 7% de (127,212,217) sur un fond (11,17,27) :")
def s2l(c): 
    c/=255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def l2s(v):
    v=max(0.0,min(1.0,v))
    return round(255*(12.92*v if v<=0.0031308 else 1.055*v**(1/2.4)-0.055))
src=(127,212,217); dst=(11,17,27); a=0.07
print("  melange sRGB (ce que fait le navigateur) :",tuple(round(a*src[i]+(1-a)*dst[i]) for i in range(3)))
print("  melange LINEAIRE (ce que fait un client non gamma-correct) :",tuple(l2s(a*s2l(src[i])+(1-a)*s2l(dst[i])) for i in range(3)))
