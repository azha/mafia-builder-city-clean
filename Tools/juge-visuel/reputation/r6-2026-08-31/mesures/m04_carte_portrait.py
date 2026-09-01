# m04 - carte du portrait: bbox exacte (bordure doree), et rendu normalise cote a cote.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
def gold(p):
    r,g,b=p[:3]; return r>110 and g>85 and b<115 and r>=g>b+25
CASES=[("ref_m120",D+"reference/m-120.png",18,376,3.0,(60,700,440,1320)),
       ("cap1920",S+"screen_b3_reputation_1080x1920.png",18,18,3.6,(60,400,510,1120))]
out={}
for k,f,ox,oy,sc,(sx0,sy0,sx1,sy1) in CASES:
    im=Image.open(f).convert("RGB"); print(f"== {k} size={im.size}")
    px=im.load()
    ys=[y for y in range(sy0,sy1) if sum(1 for x in range(sx0,sx1) if gold(px[x,y]))>0.5*(sx1-sx0)]
    xs=[x for x in range(sx0,sx1) if sum(1 for y in range(sy0,sy1) if gold(px[x,y]))>0.5*(sy1-sy0)]
    print("  bords h dores:",ys[:4],"...",ys[-4:] if ys else None)
    print("  bords v dores:",xs)
    y0,y1=min(ys),max(ys); x0,x1=min(xs),max(xs)
    print(f"  bbox px=({x0},{y0},{x1},{y1})  CSS rel cadre=({(x0-ox)/sc:.1f},{(y0-oy)/sc:.1f},{(x1-ox)/sc:.1f},{(y1-oy)/sc:.1f})")
    print(f"  taille CSS = {(x1-x0)/sc:.1f} x {(y1-y0)/sc:.1f}  ratio h/l={(y1-y0)/(x1-x0):.3f}")
    c=im.crop((x0,y0,x1+1,y1+1)).resize((int((x1-x0)/sc*4),int((y1-y0)/sc*4)),Image.LANCZOS)
    out[k]=c
W=max(c.width for c in out.values()); H=max(c.height for c in out.values())
comp=Image.new("RGB",(W*2+20,H),(255,0,255))
comp.paste(out["ref_m120"],(0,0)); comp.paste(out["cap1920"],(W+20,0))
comp.save(D+"mesures/out_carte_portrait.png"); print("ecrit out_carte_portrait.png",comp.size)
