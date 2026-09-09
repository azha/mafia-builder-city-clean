# r10-m18 : (a) couleur du filet dore du cadre et de la carte ; (b) degrade de fond du cadre.
# Controle positif (a) : le jeton or_filet #b08d3e = (176,141,62) doit etre retrouve en REF.
# Controle positif (b) : la mesure est prise dans la gouttiere u=8..14, ou m17 a montre un aplat.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,1,62),"CAP":(D+"capture-1080x2400.png",18,18,1,55)}
def med(px,x0,y0,u,v,r=3):
    vals=[px[x0+u+dx,y0+v+dy] for dx in range(-r,r+1) for dy in range(-r,r+1)]
    return tuple(sorted(c[i] for c in vals)[len(vals)//2] for i in range(3))
print("(a) filets dores  (jeton or_filet = (176,141,62))")
G={}
for k,(p,x0,y0,uf,uc) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load(); print(f"  {k} taille={im.size}")
    # prendre le pixel LE PLUS dore d'une coupe horizontale (evite l'antialiasing)
    def best(u0,v):
        cand=[px[x0+u,y0+v] for u in range(u0-3,u0+4)]
        return max(cand,key=lambda c:c[0]-c[2])
    a=best(uf,800); b=best(uc,700)
    print(f"     filet du CADRE  v=800 : {a}")
    print(f"     filet de la CARTE v=700 : {b}")
print("\n(b) degrade de fond du cadre : mediane dans la gouttiere u=8..14, par 10 % de hauteur")
for k,(p,x0,y0,uf,uc) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    prof=[]
    for i in range(11):
        v=int(8+ (1626-16)*i/10)
        vals=[px[x0+u,y0+v+dy] for u in range(8,15) for dy in range(-3,4)]
        L=sorted(0.2126*c[0]+0.7152*c[1]+0.0722*c[2] for c in vals)[len(vals)//2]
        m=med(px,x0,y0,11,v)
        prof.append((i*10,round(L,1),m))
    print(f"  {k} : "+"  ".join(f"{a}%:{b}" for a,b,_ in prof))
    print(f"        RGB  : "+" ".join(str(c) for _,_,c in prof))
