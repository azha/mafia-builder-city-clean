# m17 — le diorama de la capture et celui de la reference montrent-ils LE MEME cadrage ?
# Sans appariement, comparer leurs luminances compare deux contenus differents (piege des
# "deux variables"). On apparie par correlation normalisee sur une version reduite x4,
# a plusieurs echelles.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
ir=Image.open(R).convert('L'); ij=Image.open(J).convert('L')
print("REF",Image.open(R).size,"JEU",Image.open(J).size)
F=4
r=ir.resize((ir.width//F, ir.height//F), Image.BILINEAR)
print("reduit REF", r.size)
# motif pris dans la capture : bande du decor au-dessus du panneau, x 200..900 y 560..800
def ncc(a,b):
    n=len(a); ma=sum(a)/n; mb=sum(b)/n
    va=sum((v-ma)**2 for v in a)**0.5; vb=sum((v-mb)**2 for v in b)**0.5
    if va==0 or vb==0: return 0
    return sum((a[i]-ma)*(b[i]-mb) for i in range(n))/(va*vb)
best=[]
for ech in (0.85,0.90,0.95,1.00,1.05,1.10,1.15,1.20,1.25,1.30):
    jj = ij.resize((int(ij.width*ech), int(ij.height*ech)), Image.BILINEAR)
    j = jj.resize((jj.width//F, jj.height//F), Image.BILINEAR)
    # motif : carre 40x40 (reduit) pris au centre de la zone de decor de la capture mise a l'echelle
    mx = int(400*ech)//F; my = int(600*ech)//F
    if mx+40>j.width or my+40>j.height: continue
    mot=[j.getpixel((mx+dx,my+dy)) for dy in range(40) for dx in range(40)]
    bb=None
    for y in range(0, r.height-40, 2):
        for x in range(0, r.width-40, 2):
            pat=[r.getpixel((x+dx,y+dy)) for dy in range(40) for dx in range(40)]
            c=ncc(mot,pat)
            if bb is None or c>bb[0]: bb=(c,x*F,y*F)
    print(f"  echelle {ech:.2f} : meilleure correlation {bb[0]:.3f} a (x={bb[1]}, y={bb[2]}) dans la REF")
    best.append((bb[0],ech,bb[1],bb[2]))
best.sort(reverse=True)
print("\n  MEILLEUR :", best[0])
