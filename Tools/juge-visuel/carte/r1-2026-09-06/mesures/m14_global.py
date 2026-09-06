# m14 : couche globale (palette dominante, luminance, densite d'encre) sur la ZONE
# COMPARABLE uniquement : la carte, hors chrome. REF y 219..2085 ; CAP y 231..2151.
# + occultation de la rose des vents par la plaque VERRIER
# + contraste de l'encre de reference sur les DEUX fonds extremes
# + geometrie de la plaque (coins, bord)
from PIL import Image
import statistics
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def rl(p):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def K(a,b):
    la,lb=rl(a),rl(b); return (max(la,lb)+0.05)/(min(la,lb)+0.05)

print("\n=== PALETTE ET LUMINANCE (zone carte seulement) ===")
for nom,im,y0,y1 in [('REF',ref,219,2085),('CAP',cap,231,2151)]:
    z=im.crop((0,y0,1080,y1))
    small=z.resize((216,(y1-y0)//5),Image.LANCZOS)
    q=small.quantize(colors=8, method=Image.MEDIANCUT).convert('RGB')
    cnt=sorted(q.getcolors(100000), reverse=True)
    tot=sum(c for c,_ in cnt)
    px=small.load(); w,h=small.size
    lums=[L(px[x,y]) for y in range(h) for x in range(w)]
    encre=sum(1 for v in lums if v>60)/len(lums)
    print(f" {nom} zone {y0}..{y1} ({y1-y0} px) — luminance moyenne {statistics.mean(lums):5.2f} mediane {statistics.median(lums):5.2f}  densite(L>60) {encre*100:4.1f}%")
    for c,col in cnt[:6]:
        print(f"     {col}  {100*c/tot:5.1f}%")

print("\n=== OCCULTATION DE LA ROSE DES VENTS (plaque VERRIER 853,682..1029,714) ===")
# la rose est un blanc creme desature ; on la compte dans la ref (repere direct) et
# dans la capture, dans la meme fenetre de la peinture
S,DX,DY=1.0225,-12,8
def rose(px,x0,y0,x1,y1,w,h):
    return sum(1 for y in range(y0,y1) for x in range(x0,x1)
               if 0<=x<w and 0<=y<h and px[x,y][0]>150 and px[x,y][1]>150 and px[x,y][2]>140 and max(px[x,y])-min(px[x,y])<40)
rp,cp=ref.load(),cap.load()
rx0,ry0,rx1,ry1=940,540,1060,700
cx0,cy0,cx1,cy1=int(S*rx0+DX),int(S*ry0+DY),int(S*rx1+DX),int(S*ry1+DY)
nr=rose(rp,rx0,ry0,rx1,ry1,1080,2102); nc=rose(cp,cx0,cy0,cx1,cy1,1080,2400)
print(f"  fenetre REF ({rx0},{ry0},{rx1},{ry1}) -> {nr} px de rose")
print(f"  fenetre CAP ({cx0},{cy0},{cx1},{cy1}) -> {nc} px de rose (attendu ~{nr*S*S:.0f} si rien n'occulte)")
print(f"  perte = {100*(1-nc/(nr*S*S)):.1f}%")

print("\n=== SURFACE OPAQUE AJOUTEE PAR LES 18 PLAQUES ===")
aire_plaques=18*177*34
aire_carte=1080*(2151-231)
print(f"  18 x 177x34 = {aire_plaques} px ; carte = {aire_carte} px -> {100*aire_plaques/aire_carte:.2f}% de la carte masquee")

print("\n=== CONTRASTE DU NOM : reference vs capture ===")
print(f"  REF encre (198,189,166) sur ilot navy (26,35,51)   : {K((198,189,166),(26,35,51)):5.2f}:1")
print(f"  REF encre (198,189,166) sur ilot khaki (86,77,62)   : {K((198,189,166),(86,77,62)):5.2f}:1")
print(f"  CAP encre (235,235,236) sur plaque (140,140,148)    : {K((235,235,236),(140,140,148)):5.2f}:1   <- plancher doctrine 4,5:1 (petit texte)")
print(f"  CAP plaque (140,140,148) sur carte (21,34,47)       : {K((140,140,148),(21,34,47)):5.2f}:1")

print("\n=== GEOMETRIE DE LA PLAQUE : coins et bord (plaque LES BASSINS 78,483..254,516) ===")
for y in (483,484,485,499,514,515,516):
    print(f"  y={y}: " + " ".join(str(cp[x,y]) for x in (76,77,78,79,80,166)))
print("  colonne au bord droit :")
for x in (252,253,254,255,256):
    print(f"  x={x}: {cp[x,499]}")
