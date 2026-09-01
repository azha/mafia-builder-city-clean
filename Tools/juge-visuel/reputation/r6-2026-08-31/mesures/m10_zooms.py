# m10 - zooms normalises (meme echelle CSS) sur tete, col/cou, montre.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES={"ref":(D+"reference/m-120.png",69,732,422,1279,3.0),
       "cap":(S+"screen_b3_reputation_1080x1920.png",72,435,496,1061,3.6)}
# zones en % de la carte (x0,y0,x1,y1)
ZONES={"tete":(20,18,80,58),"col_cou":(28,53,72,80),"montre":(5,68,45,88)}
Z=8
for zn,(px0,py0,px1,py1) in ZONES.items():
    imgs=[]
    for k,(f,x0,y0,x1,y1,sc) in CASES.items():
        im=Image.open(f).convert("RGB"); W=x1-x0; H=y1-y0
        box=(x0+int(px0/100*W),y0+int(py0/100*H),x0+int(px1/100*W),y0+int(py1/100*H))
        c=im.crop(box)
        c=c.resize((int(c.width/sc*Z),int(c.height/sc*Z)),Image.NEAREST)
        print(f"{zn} {k}: source={im.size} box={box} -> {c.size}")
        imgs.append(c)
    Wm=max(i.width for i in imgs); Hm=max(i.height for i in imgs)
    comp=Image.new("RGB",(Wm*2+16,Hm),(255,0,255))
    comp.paste(imgs[0],(0,0)); comp.paste(imgs[1],(Wm+16,0))
    comp.save(D+f"mesures/out_zoom_{zn}.png")
