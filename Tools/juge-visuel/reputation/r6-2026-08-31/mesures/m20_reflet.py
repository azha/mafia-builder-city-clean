# m20 - le reflet du miroir : profil vertical sur le fond de carte (x hors figure), position, epaisseur,
# amplitude. Controle positif : le fond de carte de part et d'autre (attendu EGAL).
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",18,376,3.0,(732,1279),395,405),   # carte y0,y1 ; x hors figure
       ("cap",S+"screen_b3_reputation_1080x1920.png",18,18,3.6,(435,1061),460,475)]
for k,f,ox,oy,sc,(cy0,cy1),xa,xb in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); print(f"== {k} size={im.size}")
    prof=[]
    for y in range(cy0+10,cy0+int(0.45*(cy1-cy0))):
        v=[px[x,y] for x in range(xa,xb)]
        m=tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3))
        prof.append((y,m,sum(m)))
    base=sorted(p[2] for p in prof)[len(prof)//4]
    peak=max(prof,key=lambda p:p[2])
    hits=[p for p in prof if p[2]>base+0.4*(peak[2]-base)]
    print(f"  fond de carte (base) somme={base}  pic y={peak[0]} RGB={peak[1]} somme={peak[2]}")
    print(f"  epaisseur a mi-hauteur = {len(hits)} px = {len(hits)/sc:.1f} CSS  (de y={hits[0][0]} a y={hits[-1][0]})")
    yc=sum(p[0] for p in hits)/len(hits)
    print(f"  centre y = {yc:.1f} px | CSS depuis haut du cadre = {(yc-oy)/sc:.1f} | %hauteur de carte = {(yc-cy0)/(cy1-cy0)*100:.1f}")
    print("  profil:", [(p[0],p[1]) for p in prof if p[2]>base+0.15*(peak[2]-base)])
